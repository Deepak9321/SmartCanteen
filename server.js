require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const QRCode = require('qrcode');

const User = require('./models/User');
const Food = require('./models/Food');
const Order = require('./models/Order');
const Payment = require('./models/Payment');
const Feedback = require('./models/Feedback');
const Waste = require('./models/Waste');
const Forecast = require('./models/Forecast');
const Inventory = require('./models/Inventory');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/smart_canteen';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'dev-secret',
        resave: false,
        saveUninitialized: false,
        cookie: { maxAge: 1000 * 60 * 60 * 8 }
    })
);

function viewUser(req) {
    return req.session.user || null;
}

function auth(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    next();
}

function studentOnly(req, res, next) {
    if (!req.session.user || req.session.user.role !== 'student') {
        return res.redirect('/login');
    }
    next();
}

function managerOnly(req, res, next) {
    if (!req.session.user || req.session.user.role !== 'manager') {
        return res.status(403).send('Manager access required. <a href="/manager/login">Manager Login</a>');
    }
    next();
}

function createSessionUser(user) {
    return {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId || ''
    };
}

// ------------------------------------------------------------
// Authentication: Student login + Student registration
// Manager has a separate login page and cannot self-register.
// ------------------------------------------------------------
app.get('/login', (req, res) => {
    if (req.session.user) {
        return res.redirect(req.session.user.role === 'manager' ? '/manager' : '/student');
    }

    res.render('login', {
        error: null,
        success: req.query.created === '1' ? 'Account created successfully. Please login as a student.' : null,
        defaultRole: 'student'
    });
});

app.get('/manager/login', (req, res) => {
    if (req.session.user) {
        return res.redirect(req.session.user.role === 'manager' ? '/manager' : '/student');
    }

    res.render('login', {
        error: null,
        success: null,
        defaultRole: 'manager'
    });
});

app.get('/register', (req, res) => {
    if (req.session.user) {
        return res.redirect(req.session.user.role === 'manager' ? '/manager' : '/student');
    }

    res.render('register', { error: null, values: {} });
});

app.post('/register', async (req, res) => {
    const name = String(req.body.name || '').trim();
    const studentId = String(req.body.studentId || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const confirmPassword = String(req.body.confirmPassword || '');

    const values = { name, studentId, email };

    try {
        if (!name || !studentId || !email || !password || !confirmPassword) {
            return res.status(400).render('register', {
                error: 'Please fill all required fields.',
                values
            });
        }

        if (password.length < 6) {
            return res.status(400).render('register', {
                error: 'Password must contain at least 6 characters.',
                values
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).render('register', {
                error: 'Password and confirm password do not match.',
                values
            });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).render('register', {
                error: 'An account with this email already exists. Please login.',
                values
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await User.create({
            name,
            studentId,
            email,
            passwordHash,
            role: 'student',
            active: true
        });

        return res.redirect('/login?created=1');
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).render('register', {
            error: 'Unable to create account. Please try again.',
            values
        });
    }
});

app.post('/login', async (req, res) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        const password = String(req.body.password || '');
        const role = String(req.body.role || 'student');

        const user = await User.findOne({ email, active: true });

        if (
            !user ||
            user.role !== role ||
            !(await bcrypt.compare(password, user.passwordHash))
        ) {
            return res.status(401).render('login', {
                error: 'Invalid student email or password.',
                success: null,
                defaultRole: 'student'
            });
        }

        req.session.user = createSessionUser(user);
        return res.redirect('/student');
    } catch (error) {
        console.error('Student login error:', error);
        return res.status(500).render('login', {
            error: 'Unable to login. Please try again.',
            success: null,
            defaultRole: 'student'
        });
    }
});

app.post('/manager/login', async (req, res) => {
    try {
        const email = String(req.body.email || '').trim().toLowerCase();
        const password = String(req.body.password || '');
        const user = await User.findOne({ email, active: true });

        if (
            !user ||
            user.role !== 'manager' ||
            !(await bcrypt.compare(password, user.passwordHash))
        ) {
            return res.status(401).render('login', {
                error: 'Invalid manager email or password.',
                success: null,
                defaultRole: 'manager'
            });
        }

        req.session.user = createSessionUser(user);
        return res.redirect('/manager');
    } catch (error) {
        console.error('Manager login error:', error);
        return res.status(500).render('login', {
            error: 'Unable to login. Please try again.',
            success: null,
            defaultRole: 'manager'
        });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy(() => res.redirect('/login'));
});

app.get('/', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    return res.redirect(req.session.user.role === 'manager' ? '/manager' : '/student');
});

// ------------------------------------------------------------
// Student pages
// ------------------------------------------------------------
async function popularRecommendations(userId) {
    const mine = await Order.find({ userId }).lean();
    const bought = new Set(
        mine
            .flatMap((order) => order.items.map((item) => item.foodId?.toString()))
            .filter(Boolean)
    );

    const aggregate = await Order.aggregate([
        { $unwind: '$items' },
        {
            $group: {
                _id: '$items.foodId',
                qty: { $sum: '$items.quantity' }
            }
        },
        { $sort: { qty: -1 } },
        { $limit: 8 }
    ]);

    const ids = aggregate
        .map((item) => item._id)
        .filter((id) => !bought.has(id.toString()))
        .slice(0, 4);

    if (!ids.length) {
        const fallback = await Food.find({ available: true })
            .sort({ createdAt: -1 })
            .limit(4)
            .lean();
        return attachFoodImages(fallback);
    }

    const recommended = await Food.find({ _id: { $in: ids }, available: true }).lean();
    return attachFoodImages(recommended);
}

async function studentData(req) {
    const user = req.session.user;
    const foodRows = await Food.find({ available: true })
        .sort({ category: 1, name: 1 })
        .lean();
    const foods = attachFoodImages(foodRows);
    const orders = await Order.find({ userId: user.id })
        .sort({ createdAt: -1 })
        .limit(30)
        .lean();
    const feedbacks = await Feedback.find({ userId: user.id })
        .sort({ createdAt: -1 })
        .lean();
    const recommendations = await popularRecommendations(user.id);

    return { user, foods, orders, feedbacks, recommendations };
}

app.get('/student', studentOnly, (req, res) => res.redirect('/student/home'));

app.get('/student/home', studentOnly, async (req, res) => {
    res.render('student-home', await studentData(req));
});

app.get('/student/menu', studentOnly, async (req, res) => {
    res.render('student-menu', await studentData(req));
});

app.get('/student/cart', studentOnly, (req, res) => {
    res.render('student-cart', { user: req.session.user });
});

app.get('/student/orders', studentOnly, async (req, res) => {
    res.render('student-orders', await studentData(req));
});

app.get('/student/feedback', studentOnly, async (req, res) => {
    res.render('student-feedback', await studentData(req));
});

app.get('/payment/:id', studentOnly, async (req, res) => {
    const order = await Order.findOne({
        _id: req.params.id,
        userId: req.session.user.id
    }).lean();

    if (!order) {
        return res.status(404).send('Order not found. <a href="/student">Back to student portal</a>');
    }

    const payment = order.paymentId
        ? await Payment.findById(order.paymentId).lean()
        : null;

    res.render('payment', {
        order,
        payment,
        user: req.session.user
    });
});

// ------------------------------------------------------------
// Manager pages
// ------------------------------------------------------------
async function makeForecast(foods) {
    return foods.map((food) => {
        const history = food.salesHistory || [];
        const average = history.length
            ? history.reduce((sum, value) => sum + value, 0) / history.length
            : 20;
        const recent = history.slice(-3);
        const recentAverage = recent.length
            ? recent.reduce((sum, value) => sum + value, 0) / recent.length
            : average;
        const predicted = Math.max(
            5,
            Math.round(average * 0.6 + recentAverage * 0.4)
        );

        return {
            ...food,
            predicted,
            prepare: Math.max(1, Math.round(predicted * 0.93)),
            confidence: history.length >= 7 ? 92 : 70,
            trend:
                recentAverage > average * 1.08
                    ? 'Rising'
                    : recentAverage < average * 0.92
                        ? 'Falling'
                        : 'Stable'
        };
    });
}

async function managerData() {
    const foodRows = await Food.find().sort({ category: 1, name: 1 }).lean();
    const foods = attachFoodImages(foodRows);
    const orders = await Order.find().sort({ createdAt: -1 }).limit(50).lean();
    const waste = await Waste.find().sort({ date: -1 }).limit(30).lean();
    const feedbacks = await Feedback.find().sort({ createdAt: -1 }).limit(30).lean();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayOrders = await Order.find({
        createdAt: { $gte: today },
        status: { $nin: ['Cancelled', 'Pending Payment'] }
    }).lean();

    const revenue = todayOrders.reduce((sum, order) => sum + order.total, 0);
    const sold = todayOrders.reduce(
        (sum, order) =>
            sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
        0
    );

    const todayWaste = waste.filter((item) => new Date(item.date) >= today);
    const prepared = todayWaste.reduce((sum, item) => sum + item.prepared, 0);
    const unsold = todayWaste.reduce((sum, item) => sum + item.unsold, 0);
    const wasteKg = todayWaste.reduce((sum, item) => sum + item.unsoldKg, 0);
    const forecast = await makeForecast(foods);

    return {
        foods,
        orders,
        waste,
        feedbacks,
        forecast,
        user: null,
        stats: {
            orders: todayOrders.length,
            revenue,
            sold,
            prepared,
            unsold,
            wasteKg
        }
    };
}


async function renderManagerPage(req, res, view) {
    const data = await managerData();
    data.user = req.session.user;
    res.render(view, data);
}

app.get('/manager', managerOnly, (req, res) => res.redirect('/manager/dashboard'));
app.get('/manager/dashboard', managerOnly, (req, res) => renderManagerPage(req, res, 'manager-dashboard'));
app.get('/manager/orders', managerOnly, (req, res) => renderManagerPage(req, res, 'manager-orders'));
app.get('/manager/menu', managerOnly, (req, res) => renderManagerPage(req, res, 'manager-menu'));
app.get('/manager/forecast', managerOnly, (req, res) => renderManagerPage(req, res, 'manager-forecast'));
app.get('/manager/waste', managerOnly, (req, res) => renderManagerPage(req, res, 'manager-waste'));
app.get('/manager/sales', managerOnly, (req, res) => renderManagerPage(req, res, 'manager-sales'));
app.get('/manager/scan', managerOnly, (req, res) => renderManagerPage(req, res, 'manager-scan'));

// ------------------------------------------------------------
// Student APIs
// ------------------------------------------------------------
app.post('/api/orders', studentOnly, async (req, res) => {
    try {
        const { items, deliveryDate, deliveryTime } = req.body;

        if (!Array.isArray(items) || !items.length) {
            return res.status(400).json({ error: 'Cart is empty' });
        }

        if (!deliveryDate || !deliveryTime) {
            return res.status(400).json({ error: 'Please select delivery date and time' });
        }

        const foodIds = items.map((item) => item.foodId);
        const foods = await Food.find({ _id: { $in: foodIds } });

        const normalized = items.map((item) => {
            const food = foods.find((entry) => entry._id.toString() === item.foodId);

            if (!food) {
                throw new Error('Food not found');
            }

            const quantity = Math.max(1, Number(item.quantity) || 1);

            if (quantity > food.stock) {
                throw new Error(`${food.name} has only ${food.stock} in stock`);
            }

            return {
                foodId: food._id,
                name: food.name,
                price: food.price,
                quantity
            };
        });

        const total = normalized.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );
        const token = Math.floor(100 + Math.random() * 900);

        const order = await Order.create({
            userId: req.session.user.id,
            studentName: req.session.user.name,
            items: normalized,
            total,
            token,
            status: 'Pending Payment',
            pickupCounter: `Counter ${token % 2 + 1}`,
            deliveryDate,
            deliveryTime
        });

        res.status(201).json({
            order,
            paymentUrl: `/payment/${order._id}`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/orders/:id/pay', studentOnly, async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.params.id,
            userId: req.session.user.id
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        if (order.status !== 'Pending Payment') {
            return res.status(400).json({ error: 'Payment already processed' });
        }

        const transactionId =
            'SC' +
            Date.now().toString(36).toUpperCase() +
            Math.random().toString(36).slice(2, 7).toUpperCase();

        const payment = await Payment.create({
            orderId: order._id,
            userId: req.session.user.id,
            amount: order.total,
            method: req.body.method || 'UPI Demo',
            transactionId,
            status: 'Confirmed',
            paidAt: new Date()
        });

        const qrPayload = JSON.stringify({
            app: 'Smart Canteen',
            orderId: order._id.toString(),
            token: order.token,
            pickupCounter: order.pickupCounter,
            deliveryDate: order.deliveryDate,
            deliveryTime: order.deliveryTime,
            transactionId
        });

        const qr = await QRCode.toDataURL(qrPayload, {
            width: 260,
            margin: 1
        });

        order.paymentId = payment._id;
        order.status = 'Paid';
        order.qrData = qr;
        await order.save();

        res.json({ order, payment, qr });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/feedback', studentOnly, async (req, res) => {
    try {
        const order = await Order.findOne({
            _id: req.body.orderId,
            userId: req.session.user.id
        });

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const feedback = await Feedback.findOneAndUpdate(
            {
                orderId: order._id,
                userId: req.session.user.id
            },
            {
                rating: Number(req.body.rating),
                comment: req.body.comment || ''
            },
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        );

        res.json(feedback);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/recommendations', studentOnly, async (req, res) => {
    res.json(await popularRecommendations(req.session.user.id));
});

// ------------------------------------------------------------
// Manager APIs
// ------------------------------------------------------------
app.get('/api/manager/orders/:id', managerOnly, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).lean();

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const payment = order.paymentId
            ? await Payment.findById(order.paymentId).lean()
            : null;
        const student = order.userId
            ? await User.findById(order.userId)
                .select('name email studentId')
                .lean()
            : null;

        res.json({ order, payment, student });
    } catch (error) {
        res.status(400).json({ error: 'Invalid order ID' });
    }
});

app.post('/api/orders/:id/status', managerOnly, async (req, res) => {
    const existing = await Order.findById(req.params.id);

    if (!existing) {
        return res.status(404).json({ error: 'Order not found' });
    }

    const nextStatus = req.body.status;

    if (nextStatus === 'Picked Up' && existing.status === 'Picked Up') {
        return res.json(existing);
    }

    const order = await Order.findByIdAndUpdate(
        req.params.id,
        { status: nextStatus },
        { new: true }
    );

    if (nextStatus === 'Picked Up' && existing.status !== 'Picked Up') {
        for (const item of order.items) {
            await Food.updateOne(
                { _id: item.foodId },
                {
                    $inc: { stock: -item.quantity },
                    $push: {
                        salesHistory: {
                            $each: [item.quantity],
                            $slice: -14
                        }
                    }
                }
            );

            await Inventory.updateOne(
                { foodId: item.foodId },
                {
                    $inc: { currentStock: -item.quantity },
                    $set: { lastUpdated: new Date() }
                }
            );
        }
    }

    res.json(order);
});

function foodImagePath(name) {
    const slug = String(name || 'food')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    const jpgFile = path.join(__dirname, 'public', 'images', 'food', `${slug}.jpg`);
    return fs.existsSync(jpgFile) ? `/images/food/${slug}.jpg` : '/images/food/default.svg';
}

function attachFoodImages(foodList) {
    return (foodList || []).map((food) => ({
        ...food,
        // Always derive the image from the food name so old/stale MongoDB image
        // fields can never break the UI.
        image: foodImagePath(food.name)
    }));
}

app.locals.foodImagePath = foodImagePath;

app.post('/api/manager/food', managerOnly, async (req, res) => {
    try {
        const { id, ...data } = req.body;

        if (!data.image) {
            data.image = foodImagePath(data.name);
        }

        const food = id
            ? await Food.findByIdAndUpdate(id, data, { new: true })
            : await Food.create(data);

        await Inventory.findOneAndUpdate(
            { foodId: food._id },
            {
                foodId: food._id,
                foodName: food.name,
                currentStock: food.stock,
                reorderLevel: Math.max(10, Math.round(food.stock * 0.2)),
                lastUpdated: new Date()
            },
            { upsert: true, new: true }
        );

        res.json(food);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.post('/api/manager/waste', managerOnly, async (req, res) => {
    try {
        const waste = await Waste.create({
            foodId: req.body.foodId,
            foodName: req.body.foodName,
            prepared: Number(req.body.prepared) || 0,
            sold: Number(req.body.sold) || 0,
            unsold: Number(req.body.unsold) || 0,
            unsoldKg: Number(req.body.unsoldKg) || 0
        });

        res.json(waste);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/forecast', managerOnly, async (req, res) => {
    const foods = await Food.find().lean();
    const forecast = await makeForecast(foods);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await Forecast.deleteMany({ date: { $gte: today } });
    await Forecast.insertMany(
        forecast.map((item) => ({
            foodId: item._id,
            foodName: item.name,
            predicted: item.predicted,
            recommendedPrepare: item.prepare,
            confidence: item.confidence,
            method: '7-day + recent 3-day weighted average'
        }))
    );

    res.json(forecast);
});

app.post('/api/seed', managerOnly, async (req, res) => {
    try {
        const { execFile } = require('child_process');

        execFile(
            process.execPath,
            [path.join(__dirname, 'scripts', 'seed.js')],
            (error, stdout, stderr) => {
                if (error) {
                    return res.status(500).json({
                        error: stderr || error.message
                    });
                }

                res.json({ ok: true, message: stdout });
            }
        );
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/health', (req, res) => {
    res.json({
        ok: true,
        mongodb: mongoose.connection.readyState === 1
    });
});

mongoose
    .connect(MONGODB_URI)
    .then(() => {
        console.log('MongoDB connected');
        app.listen(PORT, () => {
            console.log(`Smart Canteen running at http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error('MongoDB connection failed:', error.message);
        process.exit(1);
    });

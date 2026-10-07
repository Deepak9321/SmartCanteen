require('dotenv').config();
const mongoose=require('mongoose');
const bcrypt=require('bcryptjs');
const User=require('../models/User');
const Food=require('../models/Food');
const Order=require('../models/Order');
const Payment=require('../models/Payment');
const Feedback=require('../models/Feedback');
const Waste=require('../models/Waste');
const Forecast=require('../models/Forecast');
const Inventory=require('../models/Inventory');
(async()=>{
  await mongoose.connect(process.env.MONGODB_URI);
  const models=[User,Food,Order,Payment,Feedback,Waste,Forecast,Inventory];
  for(const M of models){await M.createCollection().catch(()=>{});}

  const student=await User.findOneAndUpdate(
    {email:'student@smartcanteen.com'},
    {name:'Demo Student',email:'student@smartcanteen.com',passwordHash:await bcrypt.hash('Student@123',10),role:'student',studentId:'STU1001',active:true},
    {upsert:true,new:true,setDefaultsOnInsert:true}
  );
  const manager=await User.findOneAndUpdate(
    {email:'manager@smartcanteen.com'},
    {name:'Canteen Manager',email:'manager@smartcanteen.com',passwordHash:await bcrypt.hash('Manager@123',10),role:'manager',active:true},
    {upsert:true,new:true,setDefaultsOnInsert:true}
  );

  const seedFoods=[
    {name:'Paneer Rice Bowl',category:'Meals',price:90,emoji:'🍛',stock:70,prepMinutes:12,description:'Paneer, rice and fresh vegetables.',salesHistory:[55,60,64,58,67,62,64]},
    {name:'Samosa',category:'Snacks',price:25,emoji:'🥟',stock:100,prepMinutes:5,description:'Crispy potato samosa.',salesHistory:[75,82,90,78,95,80,86]},
    {name:'Veg Sandwich',category:'Snacks',price:60,emoji:'🥪',stock:50,prepMinutes:8,description:'Grilled vegetable sandwich.',salesHistory:[34,38,42,39,45,40,42]},
    {name:'Hakka Noodles',category:'Meals',price:75,emoji:'🍜',stock:40,prepMinutes:10,description:'Vegetable hakka noodles.',salesHistory:[25,28,30,27,35,29,31]},
    {name:'Masala Tea',category:'Beverages',price:20,emoji:'☕',stock:120,prepMinutes:3,description:'Hot masala tea.',salesHistory:[90,98,102,95,110,105,100]},
    {name:'Cold Coffee',category:'Beverages',price:55,emoji:'🥤',stock:45,prepMinutes:4,description:'Chilled coffee with milk.',salesHistory:[30,35,38,42,39,44,41]},
    {name:'Veg Burger',category:'Snacks',price:70,emoji:'🍔',stock:60,prepMinutes:8,description:'Crispy vegetable patty burger.',salesHistory:[38,42,45,40,48,46,44]},
    {name:'Masala Dosa',category:'Meals',price:65,emoji:'🥞',stock:55,prepMinutes:10,description:'Crispy dosa with chutney and sambar.',salesHistory:[44,48,52,46,55,51,53]},
    {name:'Chole Bhature',category:'Meals',price:85,emoji:'🍲',stock:45,prepMinutes:12,description:'Spiced chickpeas with fluffy bhature.',salesHistory:[32,35,39,36,42,40,38]},
    {name:'Idli Sambar',category:'Meals',price:50,emoji:'🥣',stock:65,prepMinutes:7,description:'Soft idlis served with sambar.',salesHistory:[40,43,45,41,47,46,44]},
    {name:'French Fries',category:'Snacks',price:55,emoji:'🍟',stock:70,prepMinutes:6,description:'Crispy salted potato fries.',salesHistory:[36,39,44,41,46,43,45]},
    {name:'Veg Momos',category:'Snacks',price:60,emoji:'🥟',stock:55,prepMinutes:9,description:'Steamed vegetable momos with dip.',salesHistory:[35,40,43,38,47,45,44]},
    {name:'Lemon Soda',category:'Beverages',price:30,emoji:'🍋',stock:90,prepMinutes:3,description:'Refreshing lemon soda.',salesHistory:[50,55,58,53,61,60,57]},
    {name:'Mango Shake',category:'Beverages',price:65,emoji:'🥭',stock:50,prepMinutes:5,description:'Thick chilled mango shake.',salesHistory:[28,32,36,34,39,37,35]},
    {name:'Chocolate Muffin',category:'Desserts',price:45,emoji:'🧁',stock:40,prepMinutes:2,description:'Soft chocolate muffin.',salesHistory:[20,24,26,22,29,27,25]},
    {name:'Fruit Cup',category:'Desserts',price:50,emoji:'🍓',stock:35,prepMinutes:4,description:'Fresh seasonal fruit cup.',salesHistory:[18,22,24,20,27,25,23]}
  ];
  for(const data of seedFoods){data.image='/images/food/'+data.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'.jpg'; await Food.findOneAndUpdate({name:data.name},{$set:{image:data.image},$setOnInsert:data}, {upsert:true,new:true});}
  let foods=await Food.find().sort({createdAt:1});
  for(const f of foods){await Inventory.findOneAndUpdate({foodId:f._id},{foodId:f._id,foodName:f.name,currentStock:f.stock,reorderLevel:Math.max(10,Math.round(f.stock*.2)),lastUpdated:new Date()},{upsert:true,new:true});}

  if(await Order.countDocuments()===0){
    const orders=[];
    for(let i=0;i<10;i++){
      const f=foods[i%foods.length]; const qty=(i%3)+1; const token=100+i;
      orders.push({userId:student._id,studentName:student.name,items:[{foodId:f._id,name:f.name,price:f.price,quantity:qty}],total:f.price*qty,token,status:i<3?'Ready':'Picked Up',pickupCounter:'Counter '+((i%2)+1),deliveryDate:new Date().toISOString().slice(0,10),deliveryTime:['10:00 - 10:30','11:00 - 11:30','12:00 - 12:30','13:00 - 13:30'][i%4]});
    }
    const created=await Order.insertMany(orders);
    const payments=await Payment.insertMany(created.map(o=>({orderId:o._id,userId:student._id,amount:o.total,method:'UPI Demo',transactionId:'TXNSEED'+o._id.toString().slice(-8).toUpperCase(),status:'Confirmed',paidAt:new Date()})));
    for(let i=0;i<created.length;i++) await Order.updateOne({_id:created[i]._id},{$set:{paymentId:payments[i]._id}});
    await Feedback.create([{orderId:created[1]._id,userId:student._id,rating:5,comment:'Quick pickup and tasty food.'},{orderId:created[3]._id,userId:student._id,rating:4,comment:'Good, queue was short.'}]);
  }
  if(await Waste.countDocuments()===0){await Waste.insertMany(foods.slice(0,5).map((f,i)=>({foodId:f._id,foodName:f.name,prepared:f.stock,sold:Math.max(0,f.stock-[6,14,8,5,12][i]),unsold:[6,14,8,5,12][i],unsoldKg:[0.9,1.4,0.7,0.6,0.8][i]})));}
  if(await Forecast.countDocuments()===0){await Forecast.insertMany(foods.map(f=>{const h=f.salesHistory||[];const avg=h.length?h.reduce((a,b)=>a+b,0)/h.length:20;const pred=Math.max(5,Math.round(avg*1.05));return {foodId:f._id,foodName:f.name,predicted:pred,recommendedPrepare:Math.max(1,Math.round(pred*.93)),confidence:h.length>=7?92:70};}));}
  console.log('Database setup complete. Collections: users, foods, orders, payments, feedbacks, wastes, forecasts, inventories');
  console.log('Student: student@smartcanteen.com / Student@123');
  console.log('Manager: manager@smartcanteen.com / Manager@123');
  await mongoose.disconnect();
})().catch(e=>{console.error(e);process.exit(1)});

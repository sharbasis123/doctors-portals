const express = require('express')
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const app = express()
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

app.use(cors())
app.use(express.json())

// username :dbjohnn1
// password:tx6kerv7KsEGK6Nz


const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)


const uri =process.env. MONGODB_URL;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});



function verifyJWT(req,res,next){
  const authHeader = req.headers.authorization;
  if(!authHeader){
    return res.status(401).send({message:'Unauthorized access'})
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET , function(err, decoded) {
    if(err){
      return res.status(403).send({message: 'Forbidden access'})
    }
    req.decoded= decoded;
    next();
  });
}



async function run() {
  try {
    await client.connect();
   const  appointmentcollection = client.db('doctors_portal') .collection('appointmentService')
   const  ordercollection = client.db('doctors_portal') .collection('appointmentOrder')
   const  usercollection = client.db('doctors_portal') .collection('user')
   const  doctorcollection = client.db('doctors_portal') .collection('doctors')
  
//    ////data mongo thaka naouea \\\\\\\\\\
   app.get('/appointment',async(req,res) =>{
    const query = {};
    const cursor = appointmentcollection.find(query);
    const  apppintment = await cursor.toArray();
    res.send(apppintment)
   })
  



    app.get('/available',async(req,res) =>{

      const date = req.query.date;

      // step 1:get all services

        const  appintment = await appointmentcollection.find().toArray();

        // ///step 2:get the booking of that day 
        const query = {date: date}
        const order = await ordercollection.find(query).toArray()
        // console.log(order)

        ////////step 3 : for each serice,find booking for that service \\\\\\

        appintment.forEach(appintment => { 
          const appintmentorder = order.filter(b => b.treatment ===  appintment.name)
          // console.log(appintmentorder)
          const booked = appintmentorder.map(s => s.slot);
          // console.log(booked)
          //  appintment.booked = booked
          // appintment.booked = appintmentorder.map(s => s.time)
          const available = appintment.slots.filter(s=>!booked.includes(s));
          // console.log(available)
          appintment.slots= available;
        })
        
        res.send(appintment)
    })


    // /////specific email er jono data loade korae\\\\\\\\
    app.get('/booking',async(req,res) => {
      const patient = req.query.email;
      console.log(patient)
      const authorization = req.headers;
      console.log('auth header',authorization)
      // const decodedEmail = req.decoded.email
      // if(patient === decodedEmail){
        const query = {Email: patient}
        // console.log(query)
        const order = await ordercollection.find(query).toArray()
        // console.log(order)
        res.send(order)
      // }
      // else{
      //   return res.status(403).send({message: 'Forbidden access'})
      // }

    })


    // //////////put mane update if exists or insert if does not exist\\\\\\\\
    app.put('/user/:email',async(req,res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = {email: email};
      const options = {upsert : true}
      const updateDoc = {
        $set: user,
      };
      const result = await usercollection.updateOne(filter,updateDoc,options);
      const token = jwt.sign({email:user.email},process.env.ACCESS_TOKEN_SECRET)
      res.send({result ,token})

    })

    // ////////somosto users ka mongo thaka naouea\\\\\\\\\\\\\
    app.get('/uses',async(req,res) => {
      const query ={}
      const cursor = usercollection.find(query);
      const  users = await cursor.toArray();
      res.send(users)
    });




    app.put('/user/admin/:email',async(req,res) => {
      const email = req.params.email;
      const requester = req.params.email;
      
      const requesteraccount = await usercollection.findOne({email:requester})
     
      // if(requesteraccount.role == 'admin'){
        // console.log(requesteraccount)
        
        const filter = {email: email};
        // console.log(filter)
        const updateDoc = {
          $set: {role:'admin'},
        };
        const result = await usercollection.updateOne(filter,updateDoc);
        res.send(result )

      // }
      // else{
      //   res.status(403).send({message:'forbissen'})
      // }
     

    })


    app.get('/admin/:email',async(req,res) => {
      const email = req.params.email;
      const user= await usercollection.findOne({email:email});
      const isAdmin = user.role === 'admin';
      res.send({admin: isAdmin})
    })










    // /////appoinent guli ka post korae\\\\\\\
    app.post('/order',async(req,res) => {
        const Order = req.body;
        // /////////user akdin a aktai appoitment nitae parbae\\\\\\\\\\\\\\\\
        const query = {treatment:Order.treatment, date: Order.date, Email:Order.Email}
        ///////
        const exist  = await ordercollection.findOne(query)
        if(exist){
          return res.send({success:false,Order: exist})
          
        }
        const result = await ordercollection .insertOne(Order)
        return res.send({success: true,result})

    })


    // ////////////////////doctorcollection\\\\\\\\\\\\\\\\\
    app.post('/doctor',async(req,res) => {
      const doctor=req.body;
      const result = await doctorcollection.insertOne(doctor);
      res.send(result)
    })

    app.get('/doctors',async(req,res) => {
      const doctors = await doctorcollection.find().toArray()
      res.send(doctors)
    })


    app.delete('/doctors/:email',async(req,res) => {
      const email = req.params.email;
      const query = {email:email};
      const result = await doctorcollection.deleteOne(query)
      res.send(result)
    })


    app.get('/payment/:id',async(req,res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const booking = await ordercollection.findOne(query)
      res.send(booking)
    })







  }

   
  
   catch(error) {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}

run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
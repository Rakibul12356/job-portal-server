const express = require('express');
const cors = require('cors');
const app=express()
const port = process.env.PORT||3444004
app.use(cors())
app.use(express.json())
app.get('/',(req,res)=>{
res.send('this is index2')
})
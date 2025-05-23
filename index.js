const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const port = process.env.PORT || 5000;
//VZ29RsT4Qr6XSJnC
//
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req,res,next) =>{
  const token = req?.cookies?.token;
  if(!token){
    return res.status(401).send({message:'Unauthorized access'})
  }
  jwt.verify(token,process.env.JWT_SECRET,(err,decode)=>{
    if(err){
       return res.status(401).send({message:'Unauthorized access'})
    }
    req.user=decode
    next()
  })
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.j9djoaf.mongodb.net/?appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    //Auth related ais
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "3h" });
      res.cookie("token", token, {
        httpOnly: true,
        secure: false, //set true in production with HTTPS
      });
      res.send({ success: true });
    });

    //jobs related apis
    const jobsCollection = client.db("job-portal").collection("jobs");
    const jobApplicationCollection = client
      .db("job-portal")
      .collection("jobs_applications");

    app.get("/jobs", async (req, res) => {
      const email = req.query.email;
      let query = {};
      if (email) {
        query = { hr_email: email };
      }
      const cursor = jobsCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/jobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });

    app.post("/jobs", async (req, res) => {
      const newJob = req.body;
      console.log(newJob);
      const result = await jobsCollection.insertOne(newJob);
      res.send(result);
    });
    app.get("/job-applications",verifyToken, async (req, res) => {
      const email = req.query.email;
      const query = { applicant_email: email };

      if(req.user.email !== req.query.email){
        return res.status(403).send({message:'forbidden Access'})
      }

      const result = await jobApplicationCollection.find(query).toArray();
      //fokira way to aggregate data
      for (const application of result) {
        const query1 = { _id: new ObjectId(application.job_id) };
        const job = await jobsCollection.findOne(query1);
        if (job) {
          application.title = job.title;
          application.location = job.location;
          application.company = job.company;
          application.company_logo = job.company_logo;
          application.category = job.category;
        }
      }
      res.send(result);
    });

    app.get("/job-applications/jobs/:job_id", async (req, res) => {
      const JobId = req.params.job_id;
      const query = { job_id: JobId };
      const result = await jobApplicationCollection.find(query).toArray();
      console.log(result);
      res.send(result);
    });

    //job application apis
    app.post("/job-applications", async (req, res) => {
      const application = req.body;
      const result = await jobApplicationCollection.insertOne(application);
      console.log(application);
      res.send(result);
    });

    app.patch("/job-applications/:id", async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: data.status,
        },
      };
      const result = await jobApplicationCollection.updateOne(
        filter,
        updateDoc
      );
      res.send(result);
    });
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Job is falling from the sky ");
});
app.listen(port, () => {
  console.log(`app is running on port${port}`);
});
 
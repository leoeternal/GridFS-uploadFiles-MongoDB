const express=require("express");
const bodyParser=require("body-parser");
const crypto=require("crypto");
const path=require("path");
const mongoose=require("mongoose");
const multer=require("multer");
const {GridFsStorage}=require("multer-gridfs-storage");
const Grid=require("gridfs-stream");
const app=express();

//middleware
app.use(bodyParser.urlencoded({extended:false}));

//mongo setup
const mongoURI = "mongodb://localhost:27017/upload";
mongoose.connect(mongoURI,{
    useNewUrlParser:true,
    useUnifiedTopology:true
})
const conn=mongoose.connection;

//grid setup
let gfs;
conn.on("error",console.error.bind(console,'connection error'));
conn.once('open',()=>{
    gfs=Grid(conn.db,mongoose.mongo);
    gfs.collection('uploads');
    console.log("Application is connected to Database");
})

//create storage engine
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            bucketName: 'uploads'
          };
          resolve(fileInfo);
        });
      });
    }
  });
  const upload = multer({ storage });



const port=3000;

app.get("/",(req,res)=>{
    gfs.files.find().toArray((err,files)=>{
        if(!files || files.length===0){
            res.render("index.ejs",{files:false});
        }else{
            files.map((file)=>{
                if(file.contentType==='image/jpeg' || file.contentType==='image/png'){
                    file.isImage=true;
                }else{
                    file.isImage=false;
                }
            });
            res.render("index.ejs",{files:files});
        }
    })
})

app.post("/upload",upload.single('file'),(req,res)=>{
    res.redirect("/");
})

app.get("/files",(req,res)=>{
    gfs.files.find().toArray((err,files)=>{
        if(!files || files.length===0){
            return res.status(404).json({
                err:'No files exist'
            })
        }else{
            return res.json(files);
        }
    })
})

app.get("/files/:filename",(req,res)=>{
    gfs.files.findOne({filename:req.params.filename},(err,file)=>{
        if(!file){
            return res.status(404).json({
                err:"No file exists"
            })
        }else{
            return res.json(file);
        }
    })
})


app.get('/image/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
      if (!file) {
        return res.status(404).json({
          err: 'No file exists'
        });
      }
      if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
        const bucket = new mongoose.mongo.GridFSBucket(conn, {bucketName: 'uploads',});
        const readStream = bucket.openDownloadStreamByName(file.filename);
        readStream.pipe(res);
      } else {
        res.status(404).json({
          err: 'Not an image'
        });
      }
    });
  });

app.listen(port,()=>{
    console.log(`App is running on port ${port}`);
})
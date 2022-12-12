//jshint esversion:6

require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const md5 = require("md5");
const saltRounds = 10;
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require("mongoose-findorcreate");
const crypto = require("crypto");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage").GridFsStorage;
const Grid = require("gridfs-stream");
const methodOverride = require("method-override");
const path = require("path");
const MongoClient = require('mongodb').MongoClient;
const connectEnsureLogin = require('connect-ensure-login');



mongoose.connect("mongodb+srv://admin-shubham:HeroicPass@heroicpass.qamp7ol.mongodb.net/heroicDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const app = express();

const mongoURI = "mongodb+srv://admin-shubham:HeroicPass@heroicpass.qamp7ol.mongodb.net/heroicDB";
// const db = client.db("heroicDB");
const conn = mongoose.createConnection(mongoURI);


//mongoose schema
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  password: String,
});

MongoClient.connect(mongoURI, {useNewUrlParser: true})
.then(client=> {
  const db = client.db('heroicDB');
}).catch(error => console.log(error));






//Middleware
app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(methodOverride('_method'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));



//initializing express-session
app.use(session({
  secret: "Heroic pass",
  resave: false,
  saveUninitialized: true,
  cookie: {}
}));

//initializing passport
app.use(passport.initialize());
app.use(passport.session());




//enabling the passportLocalMongoose
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


//mongoose moodel
const User = new mongoose.model("User", userSchema);
passport.use(new LocalStrategy(User.authenticate()));


passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


// rendenreing pages
app.get("/", function(req, res) {
  res.render("home");
});

app.get("/login", function(req, res) {
  res.render("login");
});
app.get("/register", function(req, res) {
  res.render("register");
});
app.get('/nursing', function(req, res) {
  // res.render('nursing');
  if(req.isAuthenticated()){
    res.render("nursing");
  } else {
    res.redirect("/login");
  }
});
app.get('/physiotherapy', function(req, res) {
  res.render('physiotherapy');
});
app.get("/gDrive", function(req, res) {
  res.render('gDrive');
});

app.get("/resources", function(req, res) {
  gfs.files.find().toArray((err, files) => {
    //check if Files
    if(!files || files.length === 0){
      res.render('resources', {files: false});
    } else {
      files.map(file => {
        if(
          file.contentType === 'application/pdf'
        ) {
          file.isFile = true;
        } else {
          file.isFile = false;
        }
      });
      res.render('resources', {files: files});
    }
  });
});

app.get('/medicalSubjects', function(req, res) {
  res.render("medicalSubjects");
});
app.get('/nursingSubjects', function(req, res) {
  res.render("nursingSubjects");
});


app.get('/pricing', function(req, res) {
  // res.render('pricing');
  if(req.isAuthenticated()){
    res.render("pricing");
  } else {
    res.redirect("/login");
  }
});

app.get("/medical",  function(req, res) {
    // res.render("medical");
  //  if logged in then only we can view this page
      if(req.isAuthenticated()){
        res.render("medical");
      } else {
        res.redirect("/login");
      }
});
app.get("/checkout", function(req, res) {
  if(req.isAuthenticated()) {
    res.render("checkout");
  } else {
    res.redirect("/login");
  }
});
app.get("/infoForm", function(req, res) {
  if(req.isAuthenticated()) {
    res.render("infoForm");
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", function(req, res) {
  req.logout(function(err) {
    if(!err) {
      res.redirect("/");
    } else {
      console.log(err);
    }
  });

});

// ////////////// passport


app.post("/register", function(req, res) {

    //THIS DOES THE WORK OF TAKING NEW EMAIL AND PASSWORD FROM USER AND SAVING IT
    User.register({username: req.body.username}, req.body.password, function(err, user) {
      if(err) {
        console.log(err);
        res.redirect("/register");
      } else {
        passport.authenticate("local")(req, res, function(){
          res.redirect("/login");
        });
      }
    });
  });

//////////////////// passport


app.post("/login", function(req, res) {

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, function(err, foundUser) {
    if(err) {
      console.log(err);
    }
    else if(req.body.username == "Admin2@gmail.com") {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/admin");
      });
    }
    else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/");
      });
    }
  });
});



app.get("/admin", function(req, res) {
  res.render("admin-page");
});
//@route post/Upload
// @desc upload file to DB




// Init gfs
let gfs, gridfsBucket ;

conn.once('open', () => {
  gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "medicalFiles"
  });

  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('medicalFiles');

});

//create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  cache: true,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      const filename = file.originalname;
      const fileInfo = {
        filename: filename,
        bucketName: 'medicalFiles'
      };
      resolve(fileInfo);
    });
  }
});
const upload = multer({ storage });



app.post('/upload', upload.fields([{name: 'medicalFiles'}]), (req, res) => {
  res.redirect("/admin");
});



//@route get/Files
//@desc display all files in json
app.get('/files', (req, res) => {
  gfs.files.find().toArray((err, files) => {
    //check if files
    if(!files || files.length === 0) {
      return res.status(404).json({
        err: 'No files exist'
      });
    }
    // files exist
    return res.json(files);
  });
});

//@route get /files/:filename
//@desc display single file object
app.get('/files/:filename', (req, res) => {
  gfs.files.findOne({
    filename: req.params.filename
  }, (err, file) => {
    // check if files
    if(!file || file.length === 0) {
      return res.status(404).json({
        err: 'No file exits'
      });
    }
    //file exits
    return {file: file.filename};
  });
});

app.post('/getfile', (req, res) => {
  let fileName = req.body.text1;
  MongoClient.connect(mongoURI, function(err, client) {
    if(err){
       return res.render('selectedFile', {title: 'Uploaded Error', message: 'MongoClient Connection error', error: err.errMsg});
    }

    const db = client.db("heroicDB");

    const collection = db.collection("medicalFiles.files");
    const collectionChunks = db.collection('medicalFiles.chunks');
    collection.find({filename: fileName}).toArray(function(err, docs) {
      if(err){
        return res.render('resources', {title: 'File error', message: 'Error findinf file', error: err.errMsg});
      }
      if(!docs || docs.length === 0){
        return res.render('resources', {title: 'Download Erroe', message: 'No file Found'});
      } else {
        //Retrieving the chunks from the db
        collectionChunks.find({files_id: docs[0]._id}).sort({n:1}).toArray(function(err, chunks) {
          if(err){
            return res.render('resources', {title: 'Download Error', message: 'Error retrieving chunks', error: err.errmsg});
          }
          if(!chunks || chunks.length === 0){
              //No data found
              return res.render('index', {title: 'Download Error', message: 'No data found'});
            }
            //Apend chunks
            let fileData = [];
            for(let i = 0; i<chunks.length; i++) {
              fileData.push(chunks[i].data.toString('base64'));
            }
            //display yhe chunks using the data URI format
            let finalFile = 'data:'+ docs[0].contentType + ';base64,' + fileData.join('');
            res.render('selectedFile', {filnalFile: finalFile});
        });
      }
  });
  });
});










app.listen(3000, function() {
  console.log("Server started on port 3000");
});

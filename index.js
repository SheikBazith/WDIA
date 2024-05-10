import express from "express";
import pg from "pg";
import env from "dotenv";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import axios from "axios";
import passport from "passport";
import { Strategy } from "passport-local";
import session from "express-session";

const port = 3000;
const app = express();
const saltRounds = 10;
env.config();

app.use(bodyParser.urlencoded({extended:true}));

const db = new pg.Client({
    user:  process.env.USER,
    host: process.env.HOSTNAME,
    database: process.env.DBNAME,
    password: process.env.PASSWORD,
    port: process.env.PORT
});

db.connect();

app.use(express.static("public"));

app.use(
    session({
      secret: "TOPSECRETWORD",
      resave: false,
      saveUninitialized: true,
    })
  );

app.use(passport.initialize());
app.use(passport.session());

app.get("/",(req,res)=>{
    res.render("home.ejs");
})

app.get("/login",(req,res)=>{
    res.render("login.ejs",{
        visible: "none",
        content: "",
    });
})

var users;
app.post("/login",async(req,res)=>{
    const email = req.body.email;
    const password = req.body.password;
    const existPassword = await db.query(`Select * from user_details where email = '${email}'`);
    users = existPassword.rows[0];
    if(existPassword.rows.length == 0){
        res.render("login.ejs",{
            visible: "block",
            content: "Email does not exist"
        })
    }
    else{
        bcrypt.compare(password,users.password,(err,result)=>{
            if(result){
                res.redirect("/home");
            }
            else{
                res.render("login.ejs",{
                    visible: "block",
                    content: "Email or Password is incorrect"
                })
            }
        })
    }
    
})

app.get("/register",(req,res)=>{
    res.render("register.ejs",{
        visible: "none",
        content: ""
    });
})

app.post("/register", async(req,res)=>{
    const username = req.body.username;
    const email = req.body.email;
    const password = req.body.password;
    const existEmail = await db.query(`Select * from user_details where email = '${email}'`);
    const users = existEmail.rows.length;
    if(users > 0){
        res.render("register.ejs",{
            visible: "block",
            content: "EMAIL Already Exists",
        });
    }
    else{
    try{
            bcrypt.hash(password,saltRounds,async(err,hash)=>{
                await db.query(`INSERT INTO user_details(username,email,password) VALUES ('${username}','${email}','${hash}')`);
            })
            res.render("register.ejs",{
                visible: "block",
                content: "Account has been created.",
            });   
        }

    catch(err){
        console.log(err);
    }
}
})

let response = [];
var oldNumber = [];
let randomNumber;
let correctYear;
var totalScore=0;
var userResponse;

app.get("/home",(req,res)=>{
    res.render("welcome.ejs");
    totalScore = 0;
    oldNumber=[];
})

app.get("/main",async (req,res)=>{ 
    if(oldNumber.length == 25){
        res.redirect("/gameOver");
        if(users.score <= totalScore){
            db.query(`update user_details set score = ${totalScore} where email = '${users.email}'`);
        }

    }
    else{
        await nextQuestion();
        res.render("main.ejs",{
            title: response.data.data[randomNumber].title,
            image: response.data.data[randomNumber].cover,
            totalScore: totalScore,
            highScore: users.score,
            totalQuestion: oldNumber.length
            });
    }
        
})

app.post("/main",async(req,res)=>{
    userResponse = req.body.year;
    if(userResponse == correctYear){
        res.redirect("/main");
        totalScore++;
    }
    else{
        res.redirect("/main");
    }
})
var reactionImage;
var quote;
app.get("/gameOver",async(req,res)=>{
    if(totalScore==0){
        reactionImage = "worst";
        quote = "You definitely aren't an otaku, though. Instead of watching anime and seeing a life with 2D waifu, maybe walk outside and find a life.";
    }
    else if(totalScore>0 && totalScore<=5){
        reactionImage = "awful";
        quote = "Just shut up already. I have nothing more to say to you. You’re way too pathetic… I’m done wasting my breath.";
    }
    else if(totalScore>=6 && totalScore<=10){
        reactionImage = "meh";
        quote = "I don’t wanna brag or anything, but when it comes to being the average—You are at the top."
    }
    else if(totalScore>=11 && totalScore<=15){
        reactionImage = "ok";
        quote="OK";
    }
    else if(totalScore>=16 && totalScore<=20){
        reactionImage = "awesome";
        quote="Perhaps you are an otaku, then. However, this is insufficient to surpass otaku, who will lick their idol just for kicks."
    }
    else if(totalScore>=21 && totalScore<=24){
        reactionImage = "amazing";
        quote="You underestimate how close you are. Try to achieve a perfect score now to join the group of weird, sweating otakus.";
    }
    else{
        reactionImage = "distinction";
        quote = "Best wishes. You received a perfect score, which indicates that you haven't been working for your future—rather, have been squandering your entire life watching anime.";
    }
    res.render("gameOver.ejs",{
        image: reactionImage,
        score: totalScore,
        quote: quote
    })
    totalScore = 0;
    oldNumber=[];
})

async function nextQuestion(){
    randomNumber = Math.floor(Math.random()*25);
    if(oldNumber.includes(randomNumber)){
        nextQuestion();
    }
    else{
        oldNumber.push(randomNumber);
        response = await axios.get(`https://malstream.vercel.app/api/popular`);
        correctYear = response.data.data[randomNumber].year;
        console.log(correctYear);
    }
}



app.listen(port,(req,res)=>{
    console.log("Listening to port "+port);
})
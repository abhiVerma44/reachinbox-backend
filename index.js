const express = require("express");
require("dotenv").config();
const session = require("express-session");
const cors = require("cors");
const {sequelize} = require('./db')
const { googlerouter } = require("./routes/google");
const passport = require("./passport")
const { routerOutlook } = require("./routes/outlook");

const app = express();
app.use(cors());

app.use(
  session({
    secret: "session",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());


app.get("/", (req, res) => {
  res.send('<a href="/auth/google">Sign in with Google</a> | <a href="/auth/outlook">Sign in with Outlook</a>');
});

app.use("/auth", googlerouter)
app.use("/auth", routerOutlook)

const port = 3000;

sequelize.sync().then(()=>{
 
  app.listen(port,()=>{
      console.log('Server is runnig ...')
  })
})
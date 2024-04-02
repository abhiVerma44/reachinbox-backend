const express =require("express")
const routerOutlook = express.Router()
const passport = require("passport");

routerOutlook.get('/outlook',
  passport.authenticate('windowslive', {
    scope: [
      'openid',
      'profile',
      'offline_access',
      'https://outlook.office.com/Mail.Read'
    ]
  })
);

routerOutlook.get('/outlook/callback', 
  passport.authenticate('windowslive', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });


module.exports= {routerOutlook}
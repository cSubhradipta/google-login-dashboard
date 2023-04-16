const express = require('express');
const session = require('express-session');
const passport = require('passport');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
.catch(err => console.log(err));  

app.listen(port, () => console.log(`Server listening on port ${port}`));

const { Schema, model } = require('mongoose');


const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('./models/user');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = await User.create({
        googleId: profile.id,
        displayName: profile.displayName,
        email: profile.emails[0].value,
        photoUrl: profile.photos[0].value
      });
    }
    done(null, user);
    } catch (err) { 
        done(err);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

app.get('/', (req, res) => {
    res.send(`
      <html>
        <body>
          <h1>Welcome to the Google Login Dashboard</h1>
          <p><a href="/auth/google">Sign in with Google</a></p>
        </body>
      </html>
    `);
  });
  
  app.get('/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] }));
  
  app.get('/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
      res.redirect('/dashboard');
    });
  
  app.get('/dashboard', (req, res) => {
    if (req.isAuthenticated()) {
        console.log(req.user);
      res.send(`
        <html>
          <body>
            <h1>Welcome to your dashboard, ${req.user.displayName}</h1>
            <p><img src="${req.user.photoUrl}" alt="User photo"></p>
            <p>Email: ${req.user.email}</p>
            <p><a href="/logout">Log out</a></p>
          </body>
        </html>
      `);
    } else {
      res.redirect('/');
    }
  });
  
  app.get('/logout', function(req, res){
  req.logout(function(){
    res.redirect('/');
  });
});



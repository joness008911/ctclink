const express = require('express');
const cookieParser = require('cookie-parser');
const cleanTrafficMiddleware = require('./cleantrafficMiddleware');

const app = express();
app.use(cookieParser());
app.use(cleanTrafficMiddleware());

// Your standard routes below
app.get('/', (req, res) => res.send('Welcome to the protected page!'));
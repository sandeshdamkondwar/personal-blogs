---
title: "How to Use Middlewares in Node"
date: 2020-02-19T01:19:07+05:30
draft: false
description: "A practical guide to understanding and using middlewares in Node.js and Express — from application-level to error handling."
tags: ["Node.js", "JavaScript", "Express", "Backend"]
categories: ["Engineering"]
---


In this article, we would be seeing middlewares in NodeJS and how we would use them in our application.

## **What are middlewares in Node.Js?**

Middlewares are functions used in connecting a bunch of isolated systems to interact and perform certain tasks. For example, think of a switch as a component and bulb as another independent component where a wire acts as a middleware to connect these both and give us the required output (In this case, electricity to light the bulb).

## **What do the hell middlewares in NodeJS?**

Typically all middlewares in nodejs/expressjs have access to request, response and next  objects. A request is something that’s coming from a browser that invokes a particular function to perform certain tasks and return a response. “A particular function” in this case is a middleware. Once the process is completed in middleware, it invokes the next middleware using the next() keyword. next() function helps to call the next middleware sitting in the stack to get executed.

And one more point to add is that request objects are available to all the functions in the next() stack. If the current middleware function doesn’t return any response or call the next(), the request will be left hanging.

To sum up, middleware functions can perform the following tasks :

-   Execute any code.
-   Make changes to any part of the code.
-   Uses request/response objects to modify the request and response objects.
-   Call the next middleware which helps in attaching any number of middleware functions to get executed in the queue.

```markup
          const app =require(‘express’)

const timeMiddleware = (req, res, next) => {

console.log(`Current time is ${new Date().getTime()}`)

next();

}

const app = express()

app.use(timeMiddleware)
```

In the above example, we can see that app.use is a middleware that gets called every time a request comes in and loaded the timeMiddleware function and logs the time.

**app.use()** means that this middleware will be called for every call to the application.

There are other middlewares in nodejs/express that include Application level, Built-in, router-level (e.g. router.use), error-handling(e.g. app.use(err,req,res)) and third-party middleware(e.g. body-parser).

### **Application-level middleware**

Let’s see what an application-level middleware does. This middleware uses the instance of express (For e.g. app.use() where the app is an instance of express).

```markup
const app = express();

app.use((req,res,next) => {

console.log(`Is the user logged in? ${req.authToken ? true : false}`);

if(!req.authToken)

            res.status(404).send(‘Unauthorized’)

           else

           next();

})
```

In the above, app.use middleware is called every time when a user makes a request to any middleware. It checks if the user is authenticated and if so, it proceeds further otherwise it sends an unauthorized error response.

### **Built-in middleware**

Express has some built-in middlewares like **express.static, express.json, express.urlencoded**  which can be passed in **app.use** to be used in the application.

**Router-level middleware**

Router-level middleware works in the same way as application-level middleware, except it is bound to an instance of express.Router().

**For example:**

```markup
const app = express();

const router = app.router()


router.use((req,res,next) => {

console.log(`Is the user logged in? ${req.authToken ? true : false}`);

next()

})
```

In the example above we would be calling router.use() on every call to the router.

**router.get/router.post**  method is used in calling subpaths.

```markup
var router = express.Router();

app.use('/first', router);

router.get('/small, smaller);

router.get('/big, bigger);
```


In the above code, you can see app.use loads /first route and when a call is made to /first/small the smaller function gets executed. And a similar one happens for /big where only the subpath routes use router.get and it can’t be used for general routes.

### **Third-Party middleware**

Now let’s jump into third-party middleware which is quite important in the applications we use. Here we would be seeing how to use body-parser middleware in our application.

```markup
const bodyParser = require(‘body-parser’);

const app = express();

app.use(bodyParser.json());

app.post(‘/’, (req,res) => {

res.json(req.body);

})
```

In the above example, the use of body-parser is that it’s used to parse the body of the incoming request typically a JSON request.

Incase if the incoming request is a urlencoded one then we would use one more parser which is app.use(bodyParser.urlencoded({ extended : true}))

So all middlewares will have the req.body property when it matches the content-type request header, body-parser would parse the body of the request and if the content-type doesn’t match anything given in the bodyParser middleware it would amount to errors in the code. If you’re using express version 4.0 and above, we should specify what should be the content-type separately. For example, app.use(bodyParser.json()) or app.use(bodyParser.urlencoded())

**Error Handling in Express Middleware**

To handle errors in middleware, there’s an err parameter attached to every request. It can be passed to the next middlewares by using the next() function. The error can be passed and can be finally handled in the last executing middleware in the stack.

**Look at the following example:**

```markup
app.get('/pageNotFound, (req, res, next) => {

  let error = new Error(‘Sorry, it’s not available’');

  error.httpStatusCode = 404;

  next(error);

});



app.get('/problemRoute, (req, res, next) => {

  let err = new Error('This route has some issues');

  err.httpStatusCode = 401;

  next(err);

});



// handles not found errors

app.use((err, req, res, next) => {

  if (err.httpStatusCode === 404) {

    res.status(400).send('NotFound');

  }

  next(err);

});



// handles unauthorized errors

app.use((err, req, res, next) => {

  if(err.httpStatusCode === 401){

    res.status(401).send('Unauthorized');

  }

  next(err);

})




// catch all

app.use((err, req, res, next) => {

  if (!res.headersSent) {

    res.status(err.httpStatusCode || 500).send(err);

  }

});
```

In the above example, we can see that there’s a chain of errors that can be handled by app.use middleware where it checks the relevant block and throws the error.

The section after catch-all comment block executes only if there are no errors handled by the above error handling blocks.

Thus, in the article, we have seen an overview of middleware in the express and how we would use them in our application.

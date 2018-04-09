var express = require("express");
var bodyParser = require("body-parser");
var logger = require("morgan");
var mongoose = require("mongoose");
var request = require("request");
var cheerio = require("cheerio");
var exphbs = require("express-handlebars");

var db = require("./models");

var PORT = 3000;

var app = express();

app.use(logger("dev"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

mongoose.Promise = Promise;
mongoose.connect(MONGODB_URI, {
});

app.set('view engine', '.hbs');

app.engine('hbs', exphbs({
  extname: '.hbs',
  defaultLayout: "main"
}
));

app.get("/", function (req, res) {
  res.render("home");
});


app.get("/scrape", function (req, res) {
  request("https://www.nytimes.com/", function (error, response, body) {
    var $ = cheerio.load(response.body);

    var articles = $(".story");
    var limit = 0;

    $(".story").each(function (i, element) {
      var result = {};

      result.title = $(this)
        .children("h2")
        .text();
      result.content = $(this)
        .children(".summary")
        .text();
      
        if(result.title === "" || result.content === "")
          return;

        console.log(result); 

      db.Article.create(result)
        .then(function (dbArticle) {
          console.log(dbArticle);
          limit++;
        })
        .catch(function (err) {
          return res.json(err);
        });
    })
  })
})


app.get("/articles", function (req, res) {
  db.Article.find({})
    .then(function (data) {
      var hbsObject = {
        articles: data
      };
      res.render('articles', hbsObject);
    })
    .catch(function (err) {
      res.json(err);
    });
});

app.get("/articles/:id", function (req, res) {
  db.Article.findOne({ _id: req.params.id })
    .populate("note")
    .then(function (data) {
      console.log(data); 

      res.render('article', data);
    })
    .catch(function (err) {
      res.json(err);
    });
});

app.post("/articles/:id", function (req, res) {
  db.Note.create(req.body)
    .then(function (dbNote) {
      console.log("server side" + dbNote);
      return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id });
    })
    .then(function (dbArticle) {
      console.log(dbArticle); 
      res.json(dbArticle); 
    })
    .catch(function (err) {
      res.json(err);
    });
});

app.get("/delete/:id", function(req, res) {
  db.Note.remove(
    {
      _id: req.params.id
    },
    function(error, removed) {
      if (error) {
        console.log(error);
        res.send(error);
      }
      else {
        console.log(removed);
        res.send(removed);
      }
    }
  );
});

app.get("*", function (req, res) {
  res.json("404: not found");
});

app.listen(PORT, function () {
  console.log("App running on port " + PORT + "!");
});

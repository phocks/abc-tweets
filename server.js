const Writable = require("stream").Writable;
const express = require("express");
const app = express();

const { TimelineStream, LikeStream, TweetStream } = require("scrape-twitter");
const JSONStream = require("JSONStream");
const pump = require("pump");

const monitorHeadStream = require("monitor-head-stream").default;

const timelineStream = () => new TimelineStream("phocks");
const likeStream = () => new LikeStream("phocks");
const tweetStream = () =>
  new TweetStream("url:abc url:net url:au", "top", { count: 40 });

const indexBy = obj => obj.id;
const skipWhenPinned = obj => obj.isPinned === true;

const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");

const adapter = new FileSync(".data/db.json");
const db = low(adapter);

const _ = require("lodash");
const axios = require("axios");

// Set some defaults (required if your JSON file is empty)
db.defaults({ tweets: [] }).write();

// make all the files in 'public' available
// https://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));

// https://expressjs.com/en/starter/basic-routing.html
app.get("/", (request, response) => {
  response.sendFile(__dirname + "/views/index.html");
});

app.get("/tweets", (request, response) => {
  const tweets = db
    .get("tweets")
    // .filter({ screenName: "abcnews" })
    .sortBy("favoriteCount")
    .reverse()
    // .take(10)
    .value();

  response.json(tweets);
});

app.get("/update" + process.env.UPDATE_PATH, (request, response) => {
  // Reset our data
  db.set("tweets", []).write();

  const readable = tweetStream();

  const receivedTweets = [];

  readable.on("data", function(tweet) {
    // Strip erroneous words from the start of the URL string
    tweet.urls.forEach((tweetUrl, iteration) => {
      tweetUrl.url = tweetUrl.url.match(
        /(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/g
      );
    });

    receivedTweets.push(tweet);
  });

  readable.on("end", async function() {
    for (const tweet of receivedTweets) {
      const embedHtml = await axios.get(
        `https://publish.twitter.com/oembed?url=https://twitter.com/user/status/${tweet.id}`
      );

      console.log(embedHtml.data.html);

      tweet.html = embedHtml.data.html;
    }

    const filteredTweets = _.uniqBy(receivedTweets, tweet => tweet.id);
    
    console.log(filteredTweets.length)

    db.set("tweets", filteredTweets).write();
  });

  response.json(tweetStream());
});

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});

function renderer() {
  return new Writable({
    objectMode: true,
    write: (data, _, done) => {
      console.log("<-", data);
      done();
    }
  });
}

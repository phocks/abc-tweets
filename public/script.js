/* globals Masonry */

console.log("hello world :o");

const main = async () => {
  const response = await fetch("/tweets");
  const data = await response.json();

  const mount = document.querySelector(".tweet-list");

  for (const tweet of data) {
    const element = document.createElement("div");
    element.className = "tweet-div grid-item";
    element.innerHTML = tweet.html;

    mount.appendChild(element);
  }

  var newScript = document.createElement("script");
  newScript.src = "https://platform.twitter.com/widgets.js";
  mount.appendChild(newScript);

  var elem = document.querySelector(".grid");
  var msnry = new Masonry(elem, {
    // options
    itemSelector: ".grid-item",
    columnWidth: 510
  });

  setIntervalX(
    function() {
      msnry.layout();
    },
    1000,
    10
  );
};

main();

function setIntervalX(callback, delay, repetitions) {
  var x = 0;
  var intervalID = window.setInterval(function() {
    callback();

    if (++x === repetitions) {
      window.clearInterval(intervalID);
    }
  }, delay);
}

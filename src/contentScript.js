"use strict";
window.$ = window.jQuery = require("jquery");
import "./contentScript.css";
const logo = chrome.runtime.getURL("icons/RNG-1-128.png");

/**
 *
 * @param {number} min
 * @param {number} max
 * @returns random number between min and max
 */
const randomIntFromInterval = (min, max) => {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
};

/**
 * checks if the random page number is this page
 * @param {number} pageNum random page number that has been selected
 * @returns boolean of if this page is the current page
 */
const onCurrentPage = (pageNum) => {
  console.group("onCurrentPage");
  const getPageNumberRegex = /page=([0-9])/gm;
  const matches = window.location.href.match(getPageNumberRegex);
  if (pageNum === 1 && matches === null) {
    // not on a specific page and random page is 1, so we are on the current page
    console.log("on current page");
    console.groupEnd();
    return true;
  }
  if (matches && matches[1]) {
    console.log("on current page");
    console.groupEnd();
    return true;
  }

  console.log("not on this page");
  console.groupEnd();
  return false;
};

/**
 * Selects a random spell from a list of items
 * adds random spell to the listing of the spell page
 * adds in required click handler to said spell to get the more-info of said spell
 * @param {*} items  jquery element with a bunch of items
 */
const randomItem = (items, onPage = false) => {
  // TODO items when onPage can be the already selected random items causing "nothing" to happen
  // think about this is good and if it is do something to show the user so it doesn't feel like "my click didn't do shit"
  const randomItem = items[Math.floor(Math.random() * items.length)];
  console.log("adding item", randomItem);
  // when the random item is on this page it already has events
  if (!onPage) {
    console.log("Adding click handler to mimic DNDBeyond more-info");
    // click
    $(randomItem).on("click", function () {
      console.group("on click");
      $(this).toggleClass("silas-fleetfoot");
      $(this).attr(
        "data-isopen",
        $(this).attr("data-isopen") == "false" ? true : false
      );
      if (!$(randomItem).next().hasClass("more-info")) {
        const pageSlug = getPageSlug();
        let endpoint 
        // equipment has a different setup
        let itemDataUrl = $(randomItem).children(":first").attr("data-url")
        if (itemDataUrl){
          endpoint = itemDataUrl
        }
        // magic items/monster/spells use this
        else if ($(randomItem).attr("data-slug")){
          endpoint = `/${pageSlug}/${$(randomItem).attr(
            "data-slug"
          )}/more-info`
        }
        // homebrew items data slug lives in the first child
        else{
          endpoint = `/${pageSlug}/${$(randomItem).children(":first").attr(
            "data-slug"
          )}/more-info`
        }
        // https://www.dndbeyond.com/homebrew/monsters/837230-strawbearry/more-info 404
        // https://www.dndbeyond.com/monsters/837230-strawbearry/more-info
        $.get(
          `https://www.dndbeyond.com${endpoint}`,
          function (data, status) {
            // due to script violation strip any scripts that come back with more info
            const scriptRegex = /<script>[\s\S]*?<\/script>/gm
            const moreInfo = data.replace(scriptRegex, "")
            $(moreInfo).find(".toggle-in-collection").prop('disabled', true);
            $(moreInfo).find(".modal-link").prop('disabled', true);
            $(moreInfo).find(".rating-up").prop('disabled', true);
            $(moreInfo).find(".rating-down").prop('disabled', true);
            $(moreInfo).insertAfter(randomItem);
            $(randomItem)
              .find("#open-indicator")
              .addClass("minus")
              .removeClass("plus");
              console.log($(randomItem).next().find(".ajax-post"))

            const addToCollectionButton = $(randomItem).next().find(".toggle-button")
            addToCollectionButton.attr("title","Disabled, use view details page")
            addToCollectionButton.find(".toggle-in-collection").css("background-color","grey")
            addToCollectionButton.css("pointer-events","none")             
            addToCollectionButton.css("cursor","default")

            const reportButton = $(randomItem).next().find(".report-button")
            reportButton.attr("title","Disabled, use view details page")
            reportButton.find("a").css("background", "grey")
            reportButton.css("pointer-events","none")             
            reportButton.css("cursor","default")

            const ratingsButtons = $(randomItem).next().find(".rating-form")
            $(randomItem).next().find(".rating-form :input").attr("disabled","disabled");
            ratingsButtons.attr("title","Disabled, use view details page")
            ratingsButtons.find(".rating-up").css("background-color", "grey")
            ratingsButtons.find(".rating-down").css("background-color", "grey")
            
            $(randomItem).next().find(".homebrew-details-footer").attr("title", "Disabled in RNG, please use view details page")
            
          }
          
        );
      } else {
        // toggle visibility
        $(randomItem).next().toggle();
        // toggle plus minus sign
        if ($(randomItem).find("#open-indicator").hasClass("minus")) {
          $(randomItem)
            .find("#open-indicator")
            .addClass("plus")
            .removeClass("minus");
        } else {
          $(randomItem)
            .find("#open-indicator")
            .addClass("minus")
            .removeClass("plus");
        }
      }

      console.groupEnd();
    });

    // hover
    $(randomItem)
      .on("mouseenter", function () {
        $(this).addClass("hover");
        $(this).addClass("samiphi-wobblecog");
      })
      .on("mouseleave", function () {
        $(this).removeClass("hover");
        $(this).removeClass("samiphi-wobblecog");
      });
  }

  $(randomItem).css("background-color", "red");
  $(randomItem).addClass("rng-injected");
  $(".listing-body .listing").prepend(randomItem);
};

/**
 *
 * @returns page slug
 */
const getPageSlug = () => {
  const urlElements = window.location.href.split("/");
 
  // replace homebrew with whatever the next element is
  if(urlElements[3] === "homebrew"){
    urlElements[3] = urlElements[4]
  }

  if (urlElements[3].includes("?")) {
    return urlElements[3].substring(0, urlElements[3].indexOf("?"));
  }
  return urlElements[3];
};

/**
 * MAIN ENTRY POINT OF THE EXTENSION
 */
const RNGMainButton = () => {
  // add the button
  const button = $(`<img class='rng-dice-button' src='${logo}'></img>`);
  const spinningBorder = $(
    `<div class='spinning-border' style='height:124px;width:124px;'></div>`
  );
  spinningBorder.hide();

  button.on("click", () => {
    console.group("RNG MAIN CLICK");
    spinningBorder.show();
    // create staging area
    if (!$(".page-header").find("#rng-staging").length) {
      const stagingDiv = $("<div id='rng-staging'></div>").hide();
      $(".page-header").append(stagingDiv);
    }
    // generate random page
    const hasNextPage = $(".listing-footer .paging-list li:last-child");
    const lastPageNum = hasNextPage.prev().text();
    const randomPageNumber = randomIntFromInterval(1, lastPageNum);
    console.log("selecting from page", randomPageNumber);
    const pageRegex = /(\?|&)page=[0-9]+/;
    const match = window.location.href.match(pageRegex);
    let randomPageToLoad;
    // do page calculations
    // either
    // the random page is this page
    // we are on page 1 (aka no page)
    // there's a filter
    // there's no filter
    // we are on a page and random page is 1 so we need ot strip the page query param
    // anything else
    if (onCurrentPage(randomPageNumber)) {
      randomItem($(".listing").children(), true);
      spinningBorder.hide();
      console.groupEnd();
      return;
    } else if (!match) {
      // on page 1
      if (window.location.href.includes("&")) {
        // a filter is applied
        randomPageToLoad = `${window.location.href}&page=${randomPageNumber}`;
      } else {
        // not on a page
        randomPageToLoad = `${window.location.href}?page=${randomPageNumber}`;
      }
    } else if (match && randomPageNumber === 1) {
      // page 1 doesn't need any page, so remove the page query param
      randomPageToLoad = window.location.href.replace(pageRegex, "");
    } else {
      // on a page, might have additional filters, so replace with the matches
      // either being a ? or a &
      randomPageToLoad = window.location.href.replace(
        pageRegex,
        `${match[1]}page=${randomPageNumber}`
      );
    }
    $("#rng-staging").load(`${randomPageToLoad} .listing`, function () {
      const items = $("#rng-staging .listing").children();
      randomItem(items);
      spinningBorder.hide();
    });
    console.groupEnd();
  });
  $(".page-header").append(button);
  spinningBorder.insertAfter(button);
};

// main entrypoint of this extension
RNGMainButton();

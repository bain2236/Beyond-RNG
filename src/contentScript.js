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
}


/**
 * checks if the random page number is this page
 * @param {number} pageNum random page number that has been selected
 * @returns boolean of if this page is the current page
 */
const onCurrentPage = (pageNum) => {
  console.group("onCurrentPage")
  const getPageNumberRegex = /page=([0-9])/gm
  const matches = window.location.href.match(getPageNumberRegex)
  if (pageNum === 1 && matches === null){
    // not on a specific page and random page is 1, so we are on the current page
    console.log("on current page")
    console.groupEnd()
    return true
  }
  if(matches && matches[1]){
    console.log("on current page")
    console.groupEnd()
    return true
  }
    
  console.log("not on this page")
  console.groupEnd()
  return false
}

/**
 * Selects a random spell from a list of spells
 * adds random spell to the listing of the spell page
 * adds in required click handler to said spell to get the more-info of said spell
 * @param {*} spells  jquery element with a bunch of spells
 */
const randomSpell = (spells) => {
  // TODO make this unique
  const randomSpell = spells[Math.floor(Math.random() * spells.length)];

  // click
  $(randomSpell).on("click", function () {
    console.group("on click");
    $(this).toggleClass("silas-fleetfoot");
    $(this).attr(
      "data-isopen",
      $(this).attr("data-isopen") == "false" ? true : false
    );
    const spellName = $(this).find(".spell-name .link").text();
    spellName.replace(/\s+/g, "-").toLowerCase();
    if (!$(randomSpell).next().hasClass("more-info")) {
      const cleanName = spellName
        .replace(/[^a-zA-Z\s]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase();
      $.get(
        `https://www.dndbeyond.com/spells/${cleanName}/more-info`,
        function (data, status) {
          const trimmed = data.substring(data.indexOf("<div class="));
          $(trimmed).insertAfter(randomSpell);
        }
      );
    } else {
      $(randomSpell).next().toggle();
    }
    console.groupEnd();
  });

  // hover
  $(randomSpell)
    .on("mouseenter", function () {
      $(this).addClass("hover");
      $(this).addClass("samiphi-wobblecog");
    })
    .on("mouseleave", function () {
      $(this).removeClass("hover");
      $(this).removeClass("samiphi-wobblecog");
    });

  $(randomSpell).css("background-color", "red");
  $(randomSpell).addClass("rng-injected");
  $(".listing-body .listing").prepend(randomSpell);
  console.log("RANDOM SPELL", $(randomSpell).find(".spell-name .link").text());
}


/**
 * MAIN ENTRY POINT OF THE EXTENSION
 */
const RNGMainButton = () => {

  const button = $(`<img class='rng-dice-button' src='${logo}'></img>`);
  const spinningBorder = $(
    `<div class='spinning-border' style='height:124px;width:124px;'></div>`
  );
  spinningBorder.hide();
  
  button.on("click", () => {
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
    if(onCurrentPage(randomPageNumber)){
      randomSpell($(".listing").children());
      spinningBorder.hide();
      return
    }
    else if (!match){
      // on page 1
      if (window.location.href.includes("&")){
        // a filter is applied
        randomPageToLoad = `${window.location.href}&page=${randomPageNumber}`
      }
      else{
        // not on a page
        randomPageToLoad = `${window.location.href}?page=${randomPageNumber}`
      }
    }
    else if (match && randomPageNumber === 1) {
      // page 1 doesn't need any page, so remove the page query param
      randomPageToLoad = window.location.href.replace(pageRegex, "");
    }
    else{
      // on a page, might have additional filters, so replace with the matches
      // either being a ? or a &
      randomPageToLoad = window.location.href.replace(
        pageRegex,
        `${match[1]}page=${randomPageNumber}`
      )
    }
    $("#rng-staging").load(`${randomPageToLoad} .listing`, function () {
      const spells = $("#rng-staging .listing").children();
      randomSpell(spells);
      spinningBorder.hide();
    });
  });
  $(".page-header").append(button);
  spinningBorder.insertAfter(button);
}



// main entrypoint of this extension
RNGMainButton()
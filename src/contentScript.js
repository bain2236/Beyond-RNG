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
 * Selects a random spell from a list of items
 * adds random spell to the listing of the spell page
 * adds in required click handler to said spell to get the more-info of said spell
 * @param {*} items  jquery element with a bunch of items
 */
const randomItem = (items) => {
  // TODO make this unique
  const randomItem = items[Math.floor(Math.random() * items.length)];

  // click
  $(randomItem).on("click", function () {
    console.group("on click");
    $(this).toggleClass("silas-fleetfoot");
    $(this).attr(
      "data-isopen",
      $(this).attr("data-isopen") == "false" ? true : false
    );
    // TODO FUCKERY TO GET THE NAME OF THE THING
    let itemName
    const item = $(this).find(".name .link");
    if (item.children().length > 0){
      // item has children, suspected magical item
      console.log("suspected magical item", item.find("span").text())
      itemName = item.find("span").text()
    }
    else{
      itemName = item.text()
    }
    console.log("RANDOM ITEM", itemName);
    itemName.replace(/\s+/g, "-").toLowerCase();
    if (!$(randomItem).next().hasClass("more-info")) {
      const cleanName = itemName
        .replace(/[^a-zA-Z\s]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase();
      const pageSlug = getPageSlug()
      // https://www.dndbeyond.com/magic-items/-staff-of-defense-/more-info
      // https://www.dndbeyond.com/magic-items/staff-of-defense/more-info
      $.get(
        `https://www.dndbeyond.com/${pageSlug}/${cleanName}/more-info`,
        function (data, status) {
          const trimmed = data.substring(data.indexOf("<div class="));
          $(trimmed).insertAfter(randomItem);
        }
      );
    } else {
      $(randomItem).next().toggle();
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

  $(randomItem).css("background-color", "red");
  $(randomItem).addClass("rng-injected");
  $(".listing-body .listing").prepend(randomItem);

}

/**
 * 
 * @returns page slug
 */
const getPageSlug = () => {
  const urlElements = window.location.href.split("/")
  console.log(urlElements)
  if(urlElements[3].includes("?")){
    return urlElements[3].substring(0, urlElements[3].indexOf('?'))
  }
  return urlElements[3]
}


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
      randomItem($(".listing").children());
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
      const items = $("#rng-staging .listing").children();
      randomItem(items);
      spinningBorder.hide();
    });
  });
  $(".page-header").append(button);
  spinningBorder.insertAfter(button);
}



// main entrypoint of this extension

RNGMainButton()
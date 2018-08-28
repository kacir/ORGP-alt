//this module contains the majority of javascript related to the project

//sets up formatting for currency numbers
var currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  // the default value for minimumFractionDigits depends on the currency
  // and is usually already 2
});

//stores the zoom level for use in switching tiptip characteristics
zoomlevel = 0;

//object that will hold the currently searched variables of focus
var current = {
  sponsor : null,
  searchTerm : null,
  interfaceType : null
};

//main object that contains function for controling interface and turning data into html elements
var build = {};

//is called when button is clicked on main page
build.displayResults = function  () {
  //remove content from info panel
  var infoPanel = d3.select("#infoPanel")
    .html("");
  
  infoPanel.append("button")
    .text("Back")
    .on("click" , build.welcomeSponsor);
  
  //request a search from for a valid name of a sponsor and get a list of possible matches
  var result = search.sponsor(current.searchTerm);
  
  //results header text
  infoPanel.append("h3")
    .text("Search Results: " + result.length)
    .attr("class" , "result-header")
    .append("br");
  
  //harvest input values of
  if (result.length === 0) {
    infoPanel.append("p")
      .text("Opps... There are no results. Sorry!");
  } else {
    infoPanel.append("div")
      .attr("class" , "results-master-container")
      .selectAll(".result-container")
      .data(result)
      .enter()
      .append("div")
      .attr("class" , "result-container")
      .html(function (d) {
        return d;})
      .on("click" , function (d) {
        current.sponsor = d;
        build.displayParkDetails();
      });
  }
  
  
};

build.displayResultPublic = function () {
  //search url limits results to within the state of arkansas, also the %20 thing encodes the spaces so it can be part of a url
  var queryUrl = "https://nominatim.openstreetmap.org/search?format=json&viewbox=-94.6178557,33.004106,-89.6422486,36.4996&bounded=1&q=" + current.searchTerm.replace(" ", "%20");
  
  $.getJSON(queryUrl, function (result) {
    console.log("These are the geocoding results");
    console.log(result);
    
    //remove content from info panel
    var infoPanel = d3.select("#infoPanel")
      .html("");
  
    infoPanel.append("button")
      .text("Back")
      .on("click" , build.welcomePublic);
    
    //results header text
    infoPanel.append("h3")
      .text("Search Results: " + result.length)
      .attr("class" , "result-header")
      .append("br");
    
    //vary the output based on if there were results or not
    if (result.length === 0) {
      infoPanel.append("p")
        .text("Opps... There are no results. Sorry!");
    } else {
      infoPanel.append("div")
        .attr("class" , "results-master-container")
        .selectAll(".result-container")
        .data(result)
        .enter()
        .append("div")
        .attr("class" , "result-container")
        .html(function (d) {
          //enter the name of the place minus the redundant united states and arkansas text.
          return d.display_name.replace(", Arkansas, United States of America", "");
        })
        .on("click" , function (d) {
          var boundingBox = [[d.boundingbox[0] , d.boundingbox[2]] , [d.boundingbox[1] , d.boundingbox[3]]];
          console.log("zooming to " + boundingBox);
          build.mapObj.fitBounds(boundingBox);
        });
    }
    
  });
};
//shows a list of parks in the side panel
build.displayParkDetails = function () {
  
  var infoPanel = d3.select("#infoPanel").html("");
  
  //add the back button
  infoPanel.append("button")
    .text("Back")
    .on("click" , build.displayResults);
 
  //change the header accordingly
  infoPanel.append("h3")
    .attr("class" , "result-header")
    .text(current.sponsor + " Funded Parks!");
  
  var sponsoredParks = search.parks(current.sponsor , "sponsor");
  
  
  //zoom map to full extent of results
  var resultLayer = L.geoJSON(sponsoredParks);
  build.mapObj.fitBounds(resultLayer.getBounds());
  
  //highlight on hover
  
  //display names of each of the parks
  infoPanel.selectAll(".park")
    .data(sponsoredParks)
    .enter()
    .append("div")
    .attr("class" , "result-container")
    .attr("title" , "Click To Zoom To Park")
    .html(function(d){
      if (d.properties.pastName === null) {
        return "<strong>" + d.properties.currentNam + "</strong>";
      } else {
        //if the park has had previous names then enter them
        return "<strong>" + d.properties.currentNam + "</strong>" + " (Prev. " + d.properties.pastName + ")";
      }
    })
    .on("click" , function (d) {
      //find the selected geometry and zoom to it
      var zoomArea = L.geoJSON(d).getBounds();
      build.mapObj.fitBounds(zoomArea);
    
    //get the feature popup to open for that particular park
    build.parksPolygon.eachLayer(function (layer) {
      if (layer.feature.properties.parkNum == d.properties.parkNum) {
        layer.openPopup();
      }
    });

      
  });
  
  //zoom to city of interest
  //filter parks according to sponsor
  //Display grant information below park
  //bind click event to each div to zoom to corresponding park facility when clicked.
  
};

build.displayHouseDetails = function () {
  var infoPanel = d3.select("#infoPanel")
    .html("");
  
  infoPanel.append("button")
    .text("Back")
    .on("click" , build.welcomeHouse);
  
  //get some kind of search result
  var queryString = "ndistrict='" + current.searchTerm.split(' ').join('') + "'";
  console.log("setting up query to district # " + queryString);
  build.houseESRILayer.setWhere(queryString);
  
  //results header text
  infoPanel.append("h3")
    .text("Search Results for grant in district: " + current.searchTerm)
    .attr("class" , "result-header")
    .append("br");
  
  //add a loading icon
  infoPanel.append("img")
    .attr("alt" , "Loading icon")
    .attr("src" , "https://gifimage.net/wp-content/uploads/2017/09/ajax-loading-gif-transparent-background-2.gif")
    .attr("id" , "loading-icon");
  
  //define a callback function that will be used when the data has been retrieved
  function callback (selectedGrantsList, houseFeature){
    console.log("Selected Grants");
    console.log(selectedGrantsList);
    
    //zoom to feature the user searched for
    console.log("Starting to fit bounds!");
    build.mapObj.fitBounds(L.geoJSON([houseFeature]).getBounds());
    
    //remove the loading icon from the window because loading is mostly done!
    infoPanel.select("#loading-icon").remove();
    
    //add data results into infoPanel
    console.log("Starting to add data into panel");
    infoPanel.selectAll(".park")
      .data(selectedGrantsList)
      .enter()
      .append("div")
      .attr("class" , "result-container")
      .text(function(d) {
        return d.properties.fiscalYear + " - " + d.properties.sponsor + ": " + currencyFormatter.format(Number(d.properties.amount));
    });
    
  }
  
  console.log("before calling AR district");
  var result = search.grantByARDistrict(build.houseESRILayer, queryString, callback);
  
};

build.layers = function () {
  console.log("Adding empty layer to map");
  
  //make the icon object for the park point svg
  var parkIcon = L.icon({
    iconUrl : "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTgwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIw%0D%0AMDAvc3ZnIj4KIDwhLS0gQ3JlYXRlZCB3aXRoIE1ldGhvZCBEcmF3IC0gaHR0cDovL2dpdGh1Yi5j%0D%0Ab20vZHVvcGl4ZWwvTWV0aG9kLURyYXcvIC0tPgogPGc+CiAgPHRpdGxlPmJhY2tncm91bmQ8L3Rp%0D%0AdGxlPgogIDxyZWN0IGZpbGw9Im5vbmUiIGlkPSJjYW52YXNfYmFja2dyb3VuZCIgaGVpZ2h0PSI0%0D%0AMDIiIHdpZHRoPSI1ODIiIHk9Ii0xIiB4PSItMSIvPgogIDxnIGRpc3BsYXk9Im5vbmUiIG92ZXJm%0D%0AbG93PSJ2aXNpYmxlIiB5PSIwIiB4PSIwIiBoZWlnaHQ9IjEwMCUiIHdpZHRoPSIxMDAlIiBpZD0i%0D%0AY2FudmFzR3JpZCI+CiAgIDxyZWN0IGZpbGw9InVybCgjZ3JpZHBhdHRlcm4pIiBzdHJva2Utd2lk%0D%0AdGg9IjAiIHk9IjAiIHg9IjAiIGhlaWdodD0iMTAwJSIgd2lkdGg9IjEwMCUiLz4KICA8L2c+CiA8%0D%0AL2c+CiA8Zz4KICA8dGl0bGU+TGF5ZXIgMTwvdGl0bGU+CiAgPGVsbGlwc2Ugcnk9IjEyOS41IiBy%0D%0AeD0iMTI5LjUiIGlkPSJzdmdfMTIiIGN5PSIyMDQuNSIgY3g9IjI3OCIgc3Ryb2tlLW9wYWNpdHk9%0D%0AIm51bGwiIHN0cm9rZS13aWR0aD0iMCIgc3Ryb2tlPSIjMDAwIiBmaWxsPSIjMDA3ZjAwIi8+CiAg%0D%0APHBhdGggc3Ryb2tlPSIjMDAwIiBpZD0ic3ZnXzEiIGQ9Im0yNzcuNjM3NTM1LDE3MS40MjQ5OTFs%0D%0AMCwtNTYuMDAwMDA0bDQyLjAwMDAwMiw1Ni4wMDAwMDRsLTQyLjAwMDAwMiwweiIgc3Ryb2tlLXdp%0D%0AZHRoPSIwIiBmaWxsPSIjZmZmZmZmIi8+CiAgPHBhdGggc3Ryb2tlPSIjMDAwIiBpZD0ic3ZnXzIi%0D%0AIGQ9Im0yNzcuNjM3NTIxLDIxMS40MjQ5OWwwLC01Nmw1OC4wMDAwMDEsNTZsLTU4LjAwMDAwMSww%0D%0AeiIgc3Ryb2tlLXdpZHRoPSIwIiBmaWxsPSIjZmZmZmZmIi8+CiAgPHBhdGggc3Ryb2tlPSIjMDAw%0D%0AIiBpZD0ic3ZnXzMiIGQ9Im0yNzcuNjM3NTMxLDI1OS40MjQ5OWwwLC01Nmw2NC45OTk5ODgsNTZs%0D%0ALTY0Ljk5OTk4OCwweiIgc3Ryb2tlLXdpZHRoPSIwIiBmaWxsPSIjZmZmZmZmIi8+CiAgPHBhdGgg%0D%0Ac3Ryb2tlPSIjMDAwIiBpZD0ic3ZnXzUiIGQ9Im0yNzguNjM3NTIsMTcwLjQyNDk5bDAsLTU2bC00%0D%0ANS45OTk5NjIsNTZsNDUuOTk5OTYyLDB6IiBzdHJva2Utd2lkdGg9IjAiIGZpbGw9IiNmZmZmZmYi%0D%0ALz4KICA8cGF0aCBzdHJva2U9IiMwMDAiIGlkPSJzdmdfNiIgZD0ibTI3OC42Mzc1MzMsMjEyLjQy%0D%0ANDk5bDAsLTU2bC01OC45OTk5NzUsNTZsNTguOTk5OTc1LDB6IiBzdHJva2Utd2lkdGg9IjAiIGZp%0D%0AbGw9IiNmZmZmZmYiLz4KICA8cGF0aCBzdHJva2U9IiMwMDAiIGlkPSJzdmdfNyIgZD0ibTI3OC42%0D%0AMzc1MjQsMjU5LjQyNDk5bDAsLTU2bC02Ny45OTk5ODEsNTZsNjcuOTk5OTgxLDB6IiBzdHJva2Ut%0D%0Ad2lkdGg9IjAiIGZpbGw9IiNmZmZmZmYiLz4KICA8cmVjdCBpZD0ic3ZnXzEwIiBoZWlnaHQ9IjIz%0D%0AIiB3aWR0aD0iMjMiIHk9IjI1NCIgeD0iMjY3LjUiIHN0cm9rZS1vcGFjaXR5PSJudWxsIiBzdHJv%0D%0Aa2Utd2lkdGg9IjAiIHN0cm9rZT0iIzAwMCIgZmlsbD0iI2ZmZmZmZiIvPgogPC9nPgo8L3N2Zz4=",
    iconSize : [40,30],
    iconAnchor : [0,0]
  });
  
  //function to convert featuers into marker objects
  function pointConverter (feature , latlng){
    var marker = L.marker(latlng , {icon : parkIcon} );
    return marker;
  }
  
  function popupBind (feature, layer) {
    var popupText = "<strong class='popuptitle'>" + feature.properties.currentNam + "</strong> <ul>";
    
    //merge properties of grant into a string list
    feature.properties.grantList.forEach(function (grant) {
      popupText = popupText + "<li>" + grant.properties.fiscalYear + " - " + currencyFormatter.format(grant.properties.amount)  + "</li>";
    });
    
    popupText = popupText + "</ul>";
    
    layer.bindPopup( popupText );
    
    layer.bindTooltip(layer.feature.properties.currentNam, {className : "zoomedoutparklabel"});
  }
  
  //add json into map
  build.grantPoint = L.geoJSON(search.grantPointData.features, 
                               {pointToLayer : pointConverter}
                              ).addTo(build.mapObj);
  build.parksPolygon = L.geoJSON(search.parksData.features, 
                                 {onEachFeature : popupBind , style : {fillColor : "green" , color : "green", opacity : 0 , fillOpacity : 0.7}}
                                ).addTo(build.mapObj);
   
  //zoom to points of interest
  build.mapObj.fitBounds(build.grantPoint.getBounds());
  
  //set up the zoom level so labels say on at lower zoom levels
  build.mapObj.on("zoomend" , function () {
    
    if ( !((zoomlevel > 13 && build.mapObj.getZoom() > 13 ) || (zoomlevel < 13 && build.mapObj.getZoom() < 13 ))) {
      if (build.mapObj.getZoom() > 13) {
        build.parksPolygon.eachLayer(function(layer) {
        layer.unbindTooltip();
        layer.bindTooltip(layer.feature.properties.currentNam, {permanent : true, className : "zoomedinparklabel"});
      });
      
      } else {
        build.parksPolygon.eachLayer(function(layer) {
          layer.unbindTooltip();
          layer.bindTooltip(layer.feature.properties.currentNam, {permanent : false, className : "zoomedoutparklabel"});
        });
      }
    }
  
    //reset the stored zoom level with the current zoom level
    zoomlevel = build.mapObj.getZoom(); 
  });
  
  //zoom to the users location assuming they are sharing their location.
  build.mapObj.locate({setView : true, maxZoom : 16});
  
};

//function that adds the house layer into the map
build.layersHouse = function (){
  //assign the layer to a variable for use with search functions
  build.houseESRILayer = L.esri.featureLayer({
    url : "https://gis.arkansas.gov/arcgis/rest/services/FEATURESERVICES/Boundaries/FeatureServer/15" ,
    simplifyFactor : 2.5
  });
  
  build.houseESRILayer.addTo(build.mapObj);
  
};

//does the inital building of the map interface
build.initalMap = function  () {
  console.log("Building Map");
  
  //create the map object that will display everything                   
  build.mapObj = L.map('map' , {zoomAnimationThreshold : 15, maxZoom : 18});
  
  //Add basemap to leaflet
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets',
    accessToken: 'pk.eyJ1Ijoicm9iZXJ0a2FjaXJhZHB0IiwiYSI6ImNqZ3BoODQ2NTAwM20ycXJ1OWpkZnh1emkifQ.MBfZdxZljkG8_JeivKerxw'
}).addTo(build.mapObj);
  
  //zoom to the entire world
  build.mapObj.fitWorld();
  
};

//does the inital building info panel for searching
build.welcomeSponsor = function  () {
  console.log("Building Welcome panel");
  
  //find the info panel div
  var infoPanel = d3.select("#infoPanel");
  
  //remove any contents of the panel from a previous search
  infoPanel.html("");
  
  //Add a friendly message into the page
  infoPanel.append("h2")
    .text("Welcome!");
  infoPanel.append("p")
    .text("Welcome to the LWCF parks viewer.");
  
  infoPanel.append("input")
    .attr("type", "search")
    .attr("id" , "search")
    .attr("placeholder" , "Sponsor Name")
    ;
  
  //bind enter event to the input to lauch search when enter is pressed
  $("#search").keypress(function (e){
    console.log("Key Pressed is: " + e.key);
      if (e.key == "Enter") {
        current.searchTerm = $("#search").val();
        build.displayResults();
      }
  });
  
  //Add button to info panel
  infoPanel.append("button")
    .text("Search")
    .on("click" , function(d) {
      current.searchTerm = $("#search").val();
      build.displayResults();
  });

  
  infoPanel.append("br");
  
  infoPanel.append("p")
    .text("We are Arkansas State Parks - Outdoor Recreation Grants Program. We help cities and counties get funding to build outdoor recreation equipment. Search this interface to grants given to your area");
};

//builds the inital search panel for public users
build.welcomePublic = function () {
    //find the info panel div
  var infoPanel = d3.select("#infoPanel");
  
  //remove any contents of the panel from a previous search
  infoPanel.html("");
  
  //Add a friendly message into the page
  infoPanel.append("h2")
    .text("Welcome!");
  infoPanel.append("p")
    .text("Welcome General Parks Viewer");
  
  infoPanel.append("input")
    .attr("type", "search")
    .attr("id" , "search")
    .attr("placeholder" , "Place or Address in AR")
    ;
  
  //bind enter event to the input to lauch search when enter is pressed
  $("#search").keypress(function (e){
    console.log("Key Pressed is: " + e.key);
      if (e.key == "Enter") {
        current.searchTerm = $("#search").val();
        build.displayResultPublic();
      }
  });
  
  //Add button to info panel
  infoPanel.append("button")
    .text("Search")
    .on("click" , function() {
      current.searchTerm = $("#search").val();
      build.displayResultPublic();
    });
};

//constructs welcome panel for state representatives
build.welcomeHouse = function () {
  
  //remove the display filter on the house layer if it exists
  build.houseESRILayer.setWhere("");
  
  //find the info panel div
  var infoPanel = d3.select("#infoPanel");
  
  //remove any contents of the panel from a previous search
  infoPanel.html("");
  
  //Add a friendly message into the page
  infoPanel.append("h2")
    .text("Welcome!");
  infoPanel.append("p")
    .text("Welcome to the outdoor grants viewer Honorable Representative.");
  
  infoPanel.append("input")
    .attr("type", "search")
    .attr("id" , "search")
    .attr("placeholder" , "District Number")
    ;
  
  //bind enter event to the input to lauch search when enter is pressed
  $("#search").keypress(function (e){
      if (e.key == "Enter") {
        current.searchTerm = $("#search").val();
        //enter function that generates some kind of results
        build.displayHouseDetails();
      }
  });
  
  //Add button to info panel
  infoPanel.append("button")
    .text("Search")
    .on("click" , function(d) {
      current.searchTerm = $("#search").val();
      //enter function that generates some kind of results
      build.displayHouseDetails();
  });
  
};

window.onload = function () {
  
  //get any url parameters entered if possible
  var urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has('type')) {
    current.interfaceType = urlParams.get('type');
    console.log("interface type choosen" + urlParams.get('type'));
  }
  
  build.initalMap();//map the map object but do not add any data to it yet
  search.loadData();//load the data needed
  
  //change which page and behavior is done based on who sees the page
  switch (current.interfaceType) {
    case "sponsor":
      build.welcomeSponsor();
      break;
    case "house":
      build.layersHouse();//house layers need to be rendered before the welcome page because the welcome page references layers created.
      build.welcomeHouse();
      break;
    case "senate":
      break;
    case "public":
      build.welcomePublic();
      break;
    case "congress":
      break;
    default:
      build.welcomePublic();
      break;
  }
    
  
  
  
};
console.log("process data mod loaded properly");

//object that keeps track of how far along the script is in loading the needed data and join it together.
loadingProgress = {grantLoaded : false,
                   parksLoaded : false,
                   layersDrawn : false,
                   featuresJoined : 0,
                   totalFeatures : 954
                  };

//returns a percent complete loading for the page
loadingProgress.percent = function () {
  var percentDone = 0;
  
  if (loadingProgress.grantLoaded === true) {
    percentDone = percentDone + 25;
  }
  if (loadingProgress.parksLoaded === true) {
    percentDone = percentDone + 25;
  }
  if (loadingProgress.layersDrawn === true) {
    percentDone = percentDone + 25;
  }
  //calculate how far on along it is on joining geospatial data together with js turf
  percentDone = percentDone + ((loadingProgress.featuresJoined / loadingProgress.totalFeatures) * 25);
  
  return percentDone;
};

loadingProgress.dropLoadingWindow = function () {
  d3.select("#modal-window").classed("hidden" , true);
};

//changes something in the interface to show its loading
loadingProgress.updateProgress = function(message){
  
  //advance the svg forward
  loadingProgress.progressSVG
    .attr("width" , loadingProgress.loadingScale(loadingProgress.percent()) );
  
  //change the percent text below svg
  d3.select("#progress-percent").html( loadingProgress.percent() + "% " + message);
};

//make the information shown inside of the loading svg
loadingProgress.makeSVG = function(){
  
  //getting overall dimentions of svg
  var width = 250;
  var height = 13;
  var cornerRounding = 20;
  
  //set a linear scale to allow for loading bar to move relitive to the size of the svg
  loadingProgress.loadingScale = d3.scaleLinear()
    .domain([0 , 100])
    .range([0 , width]);
  
  //set the dimentions of svg and assign d3 object for later use
  loadingProgress.svg = d3.select("#loadingBar")
    .attr("width" , width)
    .attr("height" , height);
  
  //set up background of svg
  loadingProgress.svg.append("rect")
    .attr("width" , width)
    .attr("height" , height)
    .attr("x" , 0)
    .attr("y" , 0)
    .style("fill" , "black")
    .attr("rx" , cornerRounding)
    .attr("ry" , cornerRounding);
  
  //portion of svg which holds progress
  loadingProgress.progressSVG = loadingProgress.svg.append("rect")
    .attr("width" , 0)
    .attr("height" , height)
    .attr("x" , 0)
    .attr("y" , 0)
    .style("fill" , "red")
    .attr("rx" , cornerRounding)
    .attr("ry" , cornerRounding);
    
};

loadingProgress.makeSVG();



search = {cityUrl : "https://raw.githubusercontent.com/kacir/data/master/city.geojson",
          grantPointUrl : "https://raw.githubusercontent.com/kacir/data/master/grantPoint.geojson",
          countyUrl : "",
          parksUrl : "https://raw.githubusercontent.com/kacir/data/master/parkFootprints.geojson",
          houseUrl : "",
          senateUrl : ""
         };

search.loadData = function () {
  
  
  //ajax call generates an unresolved promise
  var grantDiffered = $.getJSON(search.grantPointUrl , function (response) {
    search.grantPointData = response;
    
    loadingProgress.grantLoaded = true;
    loadingProgress.updateProgress("Grants Finished Loading");
    console.log("loaded grant point json data");
    console.log(search.grantPointData);
  });
  
  
  var parksDiffered = $.getJSON(search.parksUrl , function (response) {
    search.parksData = response;
    
    loadingProgress.parksLoaded = true;
    loadingProgress.updateProgress("Parks Finished Loading");
    console.log("loaded park json data");
    console.log(search.parksData);
  });
  
  //When both promises resolve then add layers into the map
  $.when(grantDiffered, parksDiffered).done(function () {
    
    loadingProgress.updateProgress("starting to join spatial and non-spatial data");
    
    //perform a spatial join between parks and grant points
    search.parksData.features.forEach( function (feature) {
      //List of associated grants asigned as a property of the properties property of the feature
      feature.properties.grantList = [];
      
      search.grantPointData.features.forEach( function (grantPoint) {
        
        //if the grant is inside the park then append into list
        if (!(turf.booleanDisjoint(feature , grantPoint))) {
          feature.properties.grantList.push(grantPoint);
          
          //progress counter by 1
          loadingProgress.featuresJoined = loadingProgress.featuresJoined + 1;
          loadingProgress.updateProgress(loadingProgress.featuresJoined + " Features Joined");//show change in progress on screen
        }
      
      });
    });
    
    loadingProgress.updateProgress("Finished Joining spatial and non-spatial data");
    
    console.log("finished spatial joining data");
    console.log(search.parksData);
    
    //make the leaflet layer groups for both the points and polygons
    build.layers();
    
    //remove the loading window because all data has been loaded and rendered into leaflet layer groups.
    loadingProgress.layersDrawn = true;
    loadingProgress.updateProgress("Finished building layers");
    loadingProgress.dropLoadingWindow();
    
    });
  
  
  
};


//search for city sponsorship information
search.sponsor = function (term) {
  var matchingFeatures = [];
  
  var features = search.parksData.features;
  
  //run same function on every feature in feature collection
  features.forEach(function (feature) {
    //check to see if the feature are null
    if (feature.properties.sponsorshi === null || feature.properties.sponsorshi === undefined) {
      return null;
    }
    
    //check to see if the terms have a matching of some kind
    if (feature.properties.sponsorshi.toUpperCase().includes(term.toUpperCase())) {
      matchingFeatures.push(feature.properties.sponsorshi);
    }
    
  });
  
  //remove all of the duplicate values from the array
  matchingFeatures = new Set(matchingFeatures);
  matchingFeatures = Array.from(matchingFeatures);
  
  return matchingFeatures;
};


//searches for information which makes the current name of the park or previous names
search.parks = function(term, termType){
  var matchingFeatures = [];
  
  //get the list of features inside of the parks json collection
  var features = search.parksData.features;
  
  switch (termType) {
    case "sponsor":
      //find parks that have the same sponsor
      
      //run same function on every feature in feature collection
      features.forEach(function (feature) {
        //check to see if the feature are null
        if (feature.properties.sponsorshi === null || feature.properties.sponsorshi === undefined) {
          return [];
        } else {
          if (feature.properties.sponsorshi == term) {
              matchingFeatures.push(feature);
              }
        }
      });
      
      return matchingFeatures;
      
      
      
    case "park":
      //loop through feature to see if anything matches
      features.forEach(function (feature) {
        if (feature.properties.currentNam === null || feature.properties.currentNam === undefined) {
          return null;
        }
    
      //check to see if any of the feature match in a case insensitive way, including both current and previous names
      if (feature.properties.currentNam.toUpperCase().includes(term.toUpperCase()) ) {
        matchingFeatures.push(feature);
      } else {
          //check any past park names for results as well.
         if (feature.properties.pastName === null || feature.properties.pastName === undefined) {
            return null;
          } else {
            if (feature.properties.pastName.toUpperCase().includes(term.toUpperCase())) {
              return feature;
            }
          }
      }
    });
  
    return matchingFeatures;

    default:
      return [];//return nothing if wrong option choosen
  }
  

};

//returns grant json data for later use
search.grant = function(term , termType) {
  
  var features = search.parksData.features;
  
  
        
      

  
};

search.grantByARDistrict = function (ESRILayer, whereClause, displayResultCallback) {
  console.log("grant by AR distric function started");
  var selectedGrantsList = [];//list of GeoJSON grant point objects that will be returne to user
  var houseFeature;
  
  console.log("Starting ESRI request");
  ESRILayer.query().where(whereClause).run(function(error, featureCollection) {
    console.log("ending ESRI request");
    houseFeature = featureCollection.features[0];//house GeoJSON feature
    console.log("The house feature is ");
    console.log(houseFeature);
    
    search.parksData.features.forEach(function(feature){
      
      //if the park and house district feature overlap then join them
      if (!turf.booleanDisjoint(houseFeature , feature)) {
        //loop through all parks given on that park
        feature.properties.grantList.forEach(function(parkGrant){
          
          var uniqueGrant =  true;
          //through list of grants already in results list
          selectedGrantsList.forEach(function(listedGrant){
            
            //if there is a redundant project found then
            if (parkGrant.properties.projectNum === listedGrant.properties.projectNum) {
              uniqueGrant = false;
            }
          });
          
          if (uniqueGrant === true) {
            selectedGrantsList.push(parkGrant);
          }
          
        });
      }
    });
    
  //fuction used for sorting objects according to variable
  selectedGrantsList.compare = function(a , b) {
    if (Number(a.properties.fiscalYear) === Number(b.properties.fiscalYear)) {return 0;}
    if ( Number(a.properties.fiscalYear) > Number(b.properties.fiscalYear)) {
      return -1;
    } else {return 1;}
  };
    
  //sort the objects according to the fiscal year
  selectedGrantsList = selectedGrantsList.sort(selectedGrantsList.compare);
  //callback function which reacts to results
  displayResultCallback(selectedGrantsList, houseFeature);
    
  });
};
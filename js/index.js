d3.selectAll(".view-selection-option")
  .on("mouseover" , function (){
    //get relative coordinates to the body element
    var coords = d3.mouse(document.body);
  
    //appy changes to the popup div
    d3.select(".hover-popup")
      .classed("hidden" , false)
      .style("left" , (coords[0] + -80) + "px")
      .style("top" , (coords[1] + -80) + "px");
  })
  .on("mouseout" , function(){
    d3.select(".hover-popup")
      .classed("hidden" , true)
      ;
  });
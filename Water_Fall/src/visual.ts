import DataViewObjects = powerbi.extensibility.utils.dataview.DataViewObjects;
module powerbi.extensibility.visual {

    //interface holds each data entry characteristics
    interface DataPoint {
        category: string;
        value: number;
        node: number;
        colour: string;
        identity: powerbi.visuals.ISelectionId;
        highlighted: boolean;
        tooltips: VisualTooltipDataItem[];
    };

    //MVC model to seperate pulling in of data from the plotting of the data
    interface ViewModel {
        dataPoints: DataPoint[];
        maxValue: number;
        minValue:number;
        highlights: boolean;
    };

    export class Visual implements IVisual {

        private host: IVisualHost;
        private svg: d3.Selection<SVGElement>;
        private barGroup: d3.Selection<SVGElement>;
        private lineGroup1: d3.Selection<SVGElement>;
        private textGroup1: d3.Selection<SVGElement>;
        private lineGroup2: d3.Selection<SVGElement>;
        private textGroup2: d3.Selection<SVGElement>;
        private xPadding: number = 0.1;
        private selectionManager: ISelectionManager;
        private xAxisGroup: d3.Selection<SVGElement>;
        private yAxisGroup: d3.Selection<SVGElement>;

        //define various settings for axis, border, line
        private settings = {
            axis: {
                x: {
                    padding: 50
                },
                y: {
                    padding: 50
                }
            },
            border: {
                top: 10
            },
            //line-- various settings to set for the line
            line1:
            {
                hidden:{
                    default: false,
                    value: false
                    
                },
                amount:
                {
                    default:null,
                    value:0
                },
                colour:
                {
                    default: "#000000",
                    value: "#000000"
                },
                text:
                {
                    default: "",
                    value: ""
                }
                
            },
            line2:
            {
                hidden:{
                    default: false,
                    value: false
                    
                },
                amount:
                {
                    default:null,
                    value:0
                },
                colour:
                {
                    default: "#000000",
                    value: "#000000"
                },
                text:
                {
                    default: "",
                    value: ""
                }
                
            }
        }

        constructor(options: VisualConstructorOptions) {
            //Create easel
            this.host = options.host;
            //Create Canvas
            this.svg = d3.select(options.element)
                .append("svg")
                .classed("Water_Fall", true);
            //Create Groups to hold elements
            this.barGroup = this.svg.append("g")
                .classed("bar-group", true);
            
            this.lineGroup1 = this.svg.append("g")
            .classed("line-group", true);

            this.textGroup1 = this.svg.append("g")
            .classed("text-group1", true);

            this.lineGroup2 = this.svg.append("g")
            .classed("line-group", true);

            this.textGroup2 = this.svg.append("g")
            .classed("text-group1", true);

            this.xAxisGroup = this.svg.append("g")
                .classed("x-axis", true);

            this.yAxisGroup = this.svg.append("g")
                .classed("y-axis", true);

            //Allows interaction with data(specifically bars)
            this.selectionManager = this.host.createSelectionManager();
        }

        //updates the graph every time its needed
        public update(options: VisualUpdateOptions) {
            //polling to Update settings when they are changed
            this.updateSettings(options);
            //Various line settings
            let line1Show = this.settings.line1.hidden.value ? true : false
            let line1Amount = this.settings.line1.amount.value;
            let line1Colour = this.settings.line1.colour.value;
            let Line1Text = this.settings.line1.text.value;

            let line2Show = this.settings.line2.hidden.value ? true : false
            let line2Amount = this.settings.line2.amount.value;
            let line2Colour = this.settings.line2.colour.value;
            let Line2Text = this.settings.line2.text.value;
            //pull data
            let viewModel = this.getViewModel(options);

            //Fixes datapoints so that they are in order
            viewModel =FixValues(viewModel);

                


            //Getting the maximum value that can be made           
            var maxVal: number = 0;
            maxVal = GetMaxValue(viewModel);    
           
            //Increase max value if the lines go higher than the graph max 
            if(+this.settings.line1.amount.value>=+this.settings.line2.amount.value)
            {
                
                if(maxVal<this.settings.line1.amount.value)
                {
                    
                    maxVal = this.settings.line1.amount.value;
                }
            }
            else if(+this.settings.line2.amount.value>+this.settings.line1.amount.value) {
                
                if(maxVal<this.settings.line2.amount.value)
                {
                    
                    maxVal = this.settings.line2.amount.value;
                }
            }
            
            

            //Getting the minimum possible value that can be made
            var minVal: number = 0;
            minVal = GetLowestValue(viewModel);
    
            //Getting viewport settings so the graph will scale nicely
            let width = options.viewport.width;
            let height = options.viewport.height;

            //define canvas size with regards to view port
            this.svg.attr({
                width: width,
                height: height
            });

            //converts cartesian co-ordinates to screen co-ords
            let yScale = d3.scale.linear()
                .domain([minVal, maxVal])
                .range([height - this.settings.axis.x.padding, 0+this.settings.border.top]);

            //creates a y axis 
            let yAxis = d3.svg.axis()
                .scale(yScale)
                .orient("left")
                .tickSize(1);

            //styles the y-axis
            this.yAxisGroup
                .call(yAxis)
                .attr({
                    transform: "translate(" + this.settings.axis.y.padding + ",0)"
                })
                .style({
                    fill: "#777777"
                })
                .selectAll("text")
                .style({
                    "text-anchor": "end",
                    "font-size": "x-small"
                });

            //converts cartesian co-ordinates to screen co-ords
            //scale is ordinal as the catergories will be placed on the x-axis and they have no inherrent value
            let xScale = d3.scale.ordinal()
                .domain(viewModel.dataPoints.map(d => d.category))
                .rangeRoundBands([this.settings.axis.y.padding, width], this.xPadding);
            
            //create an x axis
            let xAxis = d3.svg.axis()
                .scale(xScale)
                .orient("bottom")
                .tickSize(1);
            
            //style x-axis
            this.xAxisGroup
                .call(xAxis)
                .attr({
                    transform: "translate(0, " + (height - this.settings.axis.x.padding) + ")"
                })
                .style({
                    fill: "#777777"
                    
                })
                .selectAll("text")
                .attr({
                    transform: "rotate(-20)"
                })
                .style({
                    "text-anchor": "end",
                    "font-size": "x-small"
                });            
            
            //This allows you to use the d notation
            let bars = this.barGroup
                .selectAll(".bar")
                .data(viewModel.dataPoints);
            
            //create the rectangle and give it the class bar(NB)
            //Needs to have same as name as above so that they are linked
            bars.enter()
                .append("rect")
                .classed("bar", true);

            //Running total keeps track of the current running total in the waterfall
            var runningTotal: number = 0;
            
            //Style bars(width,height,y,x)
            bars
                .attr({
                    //Width is the total width divided evenly by the amount 
                    width: xScale.rangeBand(),
                    //Height is how high the bar must reach from its starting point
                    height: d => {
                        if(d.value>= 0)
                        {
                             //this value is gotten by taking into account several parts
                             //height - yScale(d.value) ---- this is from the conversion from cartesian to screen pos
                             /*

                            -                               -                                               -
                                                            *
                                                            *
                                                            *
cartesian co-ords           -    converted to screen =      -    therefore height - yScale(d.value) =       -
                            *                                                                               *
                            *                                                                               *
                            -                               -                                               -
                             
                            */
                            // this.settings.axis.x.padding takes into account the distance the x-axis was moved up
                            // yScale(Math.abs(minVal)+Math.abs(maxVal)) this takes into account the extra distance added by allowing negative values into the graph
                            // this.settings.border.top this takes into account the distance the graph was pushed down to avoid it cliping the top
                            return height - yScale(d.value) - this.settings.axis.x.padding +yScale(Math.abs(minVal)+Math.abs(maxVal))-this.settings.border.top ;
                        }
                        else{
                            //Same as above but for negatve vals
                            //the -value is made positive to get a useable height 
                            var _temp = Math.abs(d.value);
                            return height - yScale(_temp)- this.settings.axis.x.padding +yScale(Math.abs(minVal)+Math.abs(maxVal))-this.settings.border.top;
                        }
                        
                    },
                    y: d => 
                    {   
                        //This the y co-ord of the bar
                        //Screen co-ordsare taken from top down
                        //yScale fixes this issue
                        if(d.value>= 0)
                        {
                            //makes next values y point be the correct amount higher than the current point
                            if(d.category != "Total")
                            {
                            var _plotPoint = runningTotal+d.value;
                            //Change this line to the commented one if you want to revert to the previous waterfall type
                           // runningTotal = runningTotal+d.value;
                            /*if(d.node>0)
                            {
                                runningTotal = d.value;
                                return yScale(d.value)
                            }
                            else{
                                return(yScale(0));
                            }*/
                            runningTotal = d.value;
                            return yScale(d.value)
                            }
                            //Special consideration for the total bar not used anymore
                            //Make sure it always starts at 0
                            else{
                                return yScale(d.value)
                            }
                            
                        }
                        else{
                            //makes sure that the next negative point starts at the end of the last point
                            if(d.category != "Total")
                            {
                                var _plotPoint = runningTotal+d.value;
                                var oldPoint = runningTotal;
                                runningTotal = runningTotal+d.value;
                                
                                return yScale(oldPoint)
                            }
                            //Special consideration for the total bar
                            //Make sure it always starts at 0  
                            else{
                                return yScale(0)
                            }
                             
                        }
                        
                        
                    },
                    x: d => xScale(d.category)
                })
                .style({
                    fill: d => d.colour,
                    "fill-opacity": d => viewModel.highlights ? d.highlighted ? 1.0 : 0.5 : 1.0
                })
                //Basic interaction for clicking a bar(changes opacity)
                .on("click", (d) => {
                    this.selectionManager
                        .select(d.identity, true)
                        .then(ids => {
                            bars.style({
                                "fill-opacity": d =>
                                    ids.length > 0 ?
                                        ids.indexOf(d.identity) >= 0 ?
                                            1.0 :
                                            0.5 :
                                            1.0
                            });
                        });
                })
                //Shows tooltip when mouse enters
                .on("mouseover",(d) =>
                {
                    
                    let mouse = d3.mouse(this.svg.node());
                    let xCoord =mouse[0];
                    let yCoord =  mouse[1];
                    
                    this.host.tooltipService.show({
                        dataItems: d.tooltips,
                        identities: [d.identity],
                        coordinates: [xCoord,yCoord],
                        isTouchEvent: false
                    });
                })
                //moves shown tooltip when mouse moves
                .on("mousemove",(d) =>
                {
                    
                    let mouse = d3.mouse(this.svg.node());
                    let xCoord =mouse[0];
                    let yCoord =  mouse[1];
                    
                    this.host.tooltipService.move({
                        dataItems: d.tooltips,
                        identities: [d.identity],
                        coordinates: [xCoord,yCoord],
                        isTouchEvent: false
                    });
                })
                //removes tooltip when mouse leaves bar
                .on("mouseout", (d) => {
                    this.host.tooltipService.hide({
                        immediately: true,
                        isTouchEvent: false
                    });
                });
            
            //removes bar data
            bars.exit()
                .remove();

/////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////LINE 1
                //Checks if can show line1
            if(line1Show == true)
            {
                //binds data points to line, not really needed
                let lines = this.lineGroup1
                .selectAll(".aLine")
                .data(viewModel.dataPoints);

                
                
                //Append a line onto the lines element
                lines.enter()
                    .append("line")
                    .classed("aLine", true);

                
                
                //Give the line the correct Attributes to be drawn
                lines
                .attr({
                    x1: 0 + this.settings.axis.y.padding,
                    x2: width,
                    y1: yScale(line1Amount),
                    y2: yScale(line1Amount),
                    stroke:line1Colour,
                    "stroke-width":1.5
                });

                
                //removes data bind from line
                lines.exit()
                .remove();

                //bind datapoints to level 
                let text1 = this.textGroup1
                .selectAll(".aText")
                .data(viewModel.dataPoints);

                //create text element
                text1.enter()
                .append("text")
                .classed("aText", true);

                //Change the attributes of the text
                text1
                .attr({
                    x: width/2,
                    y: yScale(line1Amount),
                    
                    "font-size": 20,
                    fill: "#000000"
                })
                .text(Line1Text);

                //debind text
                text1.exit()
                .remove();

                
            }
            //Draw line at 0
            //text = "" to ignore it
            else{
                let lines = this.lineGroup1
                .selectAll(".aLine")
                .data(viewModel.dataPoints);
    
                lines.enter()
                    .append("line")
                    .classed("aLine", true);
                
                lines
                .attr({
                    x1: 0,
                    x2: 0,
                    y1: 0,
                    y2: 0,
                    stroke:"black",
                    "stroke-width":0
                });

                lines.exit()
                .remove();

                let text1 = this.textGroup1
                .selectAll(".aText")
                .data(viewModel.dataPoints);

                text1.enter()
                .append("text")
                .classed("aText", true);

                text1
                .attr({
                    x: width/2,
                    y: yScale(line1Amount),
                    
                    "font-size": 20,
                    fill: "#000000"
                })
                .text("");
                text1.exit()
                .remove();
            }
////////////////////////////////////////////////////////////////////////////////////
            if(line2Show == true)
            {
                //binds data points to line, not really needed
                let lines2 = this.lineGroup2
                .selectAll(".aLine2")
                .data(viewModel.dataPoints);

                
                
                //Append a line onto the lines element
                lines2.enter()
                    .append("line")
                    .classed("aLine2", true);

                
                
                //Give the line the correct Attributes to be drawn
                lines2
                .attr({
                    x1: 0 + this.settings.axis.y.padding,
                    x2: width,
                    y1: yScale(line2Amount),
                    y2: yScale(line2Amount),
                    stroke:line2Colour,
                    "stroke-width":1.5
                });

                
                //removes data bind from line
                lines2.exit()
                .remove();

                //bind datapoints to level 
                let text2 = this.textGroup2
                .selectAll(".aText2")
                .data(viewModel.dataPoints);

                //create text element
                text2.enter()
                .append("text")
                .classed("aText2", true);

                //Change the attributes of the text
                text2
                .attr({
                    x: width/2,
                    y: yScale(line2Amount),
                    
                    "font-size": 20,
                    fill: "#000000"
                })
                .text(Line2Text);

                //debind text
                text2.exit()
                .remove();

                
            }
            //Draw line at 0
            //text = "" to ignore it
            else{
                let lines2 = this.lineGroup2
                .selectAll(".aLine2")
                .data(viewModel.dataPoints);

                lines2.enter()
                    .append("line")
                    .classed("aLine2", true);
                
                lines2
                .attr({
                    x1: 0,
                    x2: 0,
                    y1: 0,
                    y2: 0,
                    stroke:"black",
                    "stroke-width":0
                });

                lines2.exit()
                .remove();

                let text2 = this.textGroup2
                .selectAll(".aText2")
                .data(viewModel.dataPoints);

                text2.enter()
                .append("text")
                .classed("aText2", true);

                text2
                .attr({
                    x: width/2,
                    y: yScale(line2Amount),
                    
                    "font-size": 20,
                    fill: "#000000"
                })
                .text("");
                text2.exit()
                .remove();
            }
           
                
         
            
        }
        
        private updateSettings(options:VisualUpdateOptions)
        {
            //Line1 properties to be updated
            //////////////////////////////////////////////////////////////////////

            //Show or hide line1
            this.settings.line1.hidden.value = DataViewObjects.getValue(
                options.dataViews[0].metadata.objects,{
                    objectName: "lines",
                    propertyName: "show"
                },
            this.settings.line1.hidden.default);

            //Change the value of line1
            this.settings.line1.amount.value = DataViewObjects.getValue(
                options.dataViews[0].metadata.objects,{
                    objectName: "lines",
                    propertyName: "value"
                },
                this.settings.line1.amount.default);

            //change colour of line1
            this.settings.line1.colour.value = DataViewObjects.getFillColor(
                options.dataViews[0].metadata.objects,{
                    objectName: "lines",
                    propertyName: "fill"
                },
                this.settings.line1.colour.default);

            //change text of line1
            this.settings.line1.text.value = DataViewObjects.getValue(
                options.dataViews[0].metadata.objects,{
                    objectName: "lines",
                    propertyName: "LineTitle"
                },
                this.settings.line1.text.default);
            ////////////////////////////////////////////////////////////

             //Line2 properties to be updated
            //////////////////////////////////////////////////////////////////////

            //Show or hide line1
            this.settings.line2.hidden.value = DataViewObjects.getValue(
                options.dataViews[0].metadata.objects,{
                    objectName: "lines2",
                    propertyName: "show"
                },
            this.settings.line2.hidden.default);

            //Change the value of line1
            this.settings.line2.amount.value = DataViewObjects.getValue(
                options.dataViews[0].metadata.objects,{
                    objectName: "lines2",
                    propertyName: "value"
                },
                this.settings.line2.amount.default);

            //change colour of line1
            this.settings.line2.colour.value = DataViewObjects.getFillColor(
                options.dataViews[0].metadata.objects,{
                    objectName: "lines2",
                    propertyName: "fill"
                },
                this.settings.line2.colour.default);

            //change text of line1
            this.settings.line2.text.value = DataViewObjects.getValue(
                options.dataViews[0].metadata.objects,{
                    objectName: "lines2",
                    propertyName: "LineTitle"
                },
                this.settings.line2.text.default);
            ////////////////////////////////////////////////////////////
        }

        private getViewModel(options: VisualUpdateOptions): ViewModel {

            //pulls in data
            let dv = options.dataViews;

            //Initialises a ViewModel 
            let viewModel: ViewModel = {
                dataPoints: [],
                maxValue: 0,
                minValue: 0,
                highlights: false
            };

            //makes  sure data is present
            if (!dv
                || !dv[0]
                || !dv[0].categorical
                || !dv[0].categorical.categories
                || !dv[0].categorical.categories[0].source
                || !dv[0].categorical.values[0]
                || !dv[0].categorical.values[1]
                || !dv[0].metadata)
                {
                    return viewModel;
                }
                

            let view = dv[0].categorical;
            let categories = view.categories[0];
            let values = view.values[0];
            let nodes = view.values[1];
            let highlights = values.highlights;
            let metadata = dv[0].metadata;
            let categoryColoumnNames = metadata.columns.filter(c => c.roles["category"])[0].displayName
            let valueColoumnNames = metadata.columns.filter(c => c.roles["measure"])[0].displayName
            
            //pushes datapoints to the viewmodel
            for (let i = 0, len = Math.max(categories.values.length, values.values.length); i < len; i++) {
                
                if(i<len)
                {
                    viewModel.dataPoints.push({
                   
                        category: <string>categories.values[i],
                        value: <number>values.values[i],
                        node: <number>nodes.values[i],
                        colour: getColour(<number>values.values[i]),
                        identity: this.host.createSelectionIdBuilder()
                            .withCategory(categories, i)
                            .createSelectionId(),
                        highlighted: highlights ? highlights[i] ? true : false : false,
                        tooltips:[{
                            displayName:categoryColoumnNames,
                            value: <string>categories.values[i]
                        },{
                            displayName: valueColoumnNames,
                            value: (<number>values.values[i]).toFixed(2)
                        
                        }]
                    });
                    
                }
                //Special consideration for total bar
                //will need to be done better when doing sub totals
                /*else if(i = len)
                {
                    //gets total of graph
                    var Total: number = 0;
                    var sumTot = 0;
                    for(let i =0; i < viewModel.dataPoints.length;i++)
                    {
                        var _tempVal: number = viewModel.dataPoints[i].value;
                        
                        sumTot += _tempVal;
                    }
                    Total = sumTot;

                    /////////////////////
                    viewModel.dataPoints.push({
                        
                            category: "Total",
                            value: Total,
                            colour: "#777777",
                            identity: this.host.createSelectionIdBuilder()
                                    .withCategory(categories, i)
                                    .createSelectionId(),
                            highlighted: highlights ? highlights[i] ? true : false : false
                        
                    });

                }*/

            }

            

            viewModel.maxValue = d3.max(viewModel.dataPoints, d => d.value);
            viewModel.minValue = d3.min(viewModel.dataPoints,d => d.value)
            viewModel.highlights = viewModel.dataPoints.filter(d => d.highlighted).length > 0;

            return viewModel;
        }

        //This shows the properties that you want to be shown on the properties pane
        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions):
        VisualObjectInstanceEnumeration{
            let propertyGroupName = options.objectName;
            let properties: VisualObjectInstance[] = [];

            //Different properties
            switch (propertyGroupName)
            {
                //Create a property
                //Bind settings values to these property settings
                case "lines":
                properties.push({
                    objectName: propertyGroupName,
                    properties: {
                        show: this.settings.line1.hidden.value,
                        value: this.settings.line1.amount.value,
                        fill: this.settings.line1.colour.value,
                        LineTitle: this.settings.line1.text.value
                    },
                    selector: null
                });
                break;

                case "lines2":
                properties.push({
                    objectName: propertyGroupName,
                    properties: {
                        show: this.settings.line2.hidden.value,
                        value: this.settings.line2.amount.value,
                        fill: this.settings.line2.colour.value,
                        LineTitle: this.settings.line2.text.value
                    },
                    selector: null
                });
                break;
                
            };
            
            return properties;
        }
       
    }

    //Defines standard colours for increasing and decreasing bars
    function getColour(value:number):string
    {
        if(value>0)
        {
            return "#00345E"
        }
        else{
            return "#FF0800"
        }
    }

    //makes the values on the xscale go up numerically as opposed to being based on he values valuex
    function FixValues(viewModel:ViewModel)
    {
        //Changing the order of the data so as to follow numerical order.
                //avoiding total for now
                var newDParray: DataPoint[] = new Array(0);
                //Fill array with empty data points
                for (let i = 0;i <viewModel.dataPoints.length-1;i++)
                {
                    newDParray[i] = {
                        category:"Test",
                        value: null,
                        node: null,
                        colour:"#000000",
                        identity: null,
                        highlighted:false,
                        tooltips:null
                    }
                    
                }
               
                var nameArray:string[]= new Array(0);
                //Get no. from name
                for (let i = 0;i <viewModel.dataPoints.length;i++)
                {
                    var name: string = viewModel.dataPoints[i].category;
                    var _tempname = name.split(" ");
                    var indexString:string = _tempname[0];
                    if(indexString[0] == "0")
                    {
                        indexString= indexString[1];
                    }
                   var length = nameArray.push(indexString);
                   
                }

                //turn string array into num array
                var nameArrayNum:number[]= new Array(0);
                for (let i = 0;i <nameArray.length;i++)
                {
                    var length = nameArrayNum.push(+nameArray[i]);
                }
               
                ///Find max value from array
                var _maxValueinNameArray = null
                for(let i = 0; i <nameArrayNum.length;i++)
                {
                    if(_maxValueinNameArray == null)
                    {
                        _maxValueinNameArray = nameArrayNum[i]
                    }
                    else if(_maxValueinNameArray<nameArrayNum[i])
                    {
                        _maxValueinNameArray = nameArrayNum[i]
                    }
                }
                
                
                //create datapoint array by pulling out info in the correct orde
                for (let i = 1;i <=_maxValueinNameArray;i++)
                {

                    for (let x = 0;x <nameArrayNum.length;x++)
                    {
                        if(nameArrayNum[x] == i)
                        {
                            newDParray[i] =viewModel.dataPoints[x];
                        }
                    }
                    
                }

                //Remove empty Arrays spaces 
                var _DPArray: DataPoint[] = new Array(0);
                for (let i = 1;i <newDParray.length;i++)
                {
                    if(newDParray[i].category != "Test" && newDParray[i].value != null)
                    {
                        _DPArray.push(newDParray[i]);
                    }
                }

                //"Re-upload data set to viewModel"
                viewModel.dataPoints = _DPArray;
                return viewModel
    }

    //get max values
    function GetMaxValue(viewModel:ViewModel):number
    {
        var sum = 0;
            var _Highest: number = 0
            for(let i =0; i < viewModel.dataPoints.length;i++)
            {
                var _tempVal: number = viewModel.dataPoints[i].value;
                
                if(_Highest <_tempVal)
                {
                    _Highest= _tempVal
                    
                }
                
            }
        return _Highest;
    }
    //get min value
    function GetLowestValue(viewModel:ViewModel):number
    {
        var sum = 0;
            var Lowest = 0;
            for(let i =0; i < viewModel.dataPoints.length;i++)
            {
                var _tempVal: number = viewModel.dataPoints[i].value;
                
                sum += _tempVal;
                if(sum<Lowest)
                {
                    Lowest=sum;
                }
                
            }
        return Lowest;
    }
    
    
}


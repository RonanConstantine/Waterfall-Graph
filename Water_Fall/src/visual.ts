import DataViewObjects = powerbi.extensibility.utils.dataview.DataViewObjects;
module powerbi.extensibility.visual {

    //interface holds each data entry characteristic
    interface DataPoint {
        category: string;
        value: number;
        colour: string;
        identity: powerbi.visuals.ISelectionId;
        highlighted: boolean;
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
        private lineGroup: d3.Selection<SVGElement>;
        private xPadding: number = 0.1;
        private selectionManager: ISelectionManager;
        private xAxisGroup: d3.Selection<SVGElement>;
        private yAxisGroup: d3.Selection<SVGElement>;

        //define various paddings so as to not hav bars clipping the edge of the canvas
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
            line:
            {
                hidden:{
                    default: false,
                    value: false
                    
                },
                amount:
                {
                    default:null,
                    value:0
                }
                
            }
        }

        constructor(options: VisualConstructorOptions) {
            this.host = options.host;
            this.svg = d3.select(options.element)
                .append("svg")
                .classed("Water_Fall", true);
            this.barGroup = this.svg.append("g")
                .classed("bar-group", true);
            
            this.lineGroup = this.svg.append("g")
            .classed("line-group", true);

            this.xAxisGroup = this.svg.append("g")
                .classed("x-axis", true);

            this.yAxisGroup = this.svg.append("g")
                .classed("y-axis", true);

            //Allows interaction with data
            this.selectionManager = this.host.createSelectionManager();
        }

        //updates the graph every time its needed
        public update(options: VisualUpdateOptions) {

            this.updateSettings(options);
            
            let lineShow = this.settings.line.hidden.value ? true : false
            let lineAmount = this.settings.line.amount.value;
            //pull data
            let viewModel = this.getViewModel(options);

            viewModel =FixValues(viewModel);

                


            //Getting the maximum value that can be made
            ////////////////////////
            var maxVal: number = 0;
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
            maxVal = _Highest;
            ///////////////////
            
            //Getting the minimum possible value that can be made
            ////////////////////////
            var minVal: number = 0;
            var sum = 0;
            var Lowest = 0;
            for(let i =0; i < viewModel.dataPoints.length;i++)
            {
                var _tempVal: number = viewModel.dataPoints[i].value;
                console.log("_tempVal" + _tempVal);
                
                sum += _tempVal;
                if(sum<Lowest)
                {
                    Lowest=sum;
                }
                
                minVal = Lowest;
            }
            console.log("kcdejkf" + minVal);
            //////////////////
            
            
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

               


                
            
            
                //define bar group and embed data into it
            
            
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
                            -                               -                                               *
                             
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
                           runningTotal = d.value;
                            return yScale(d.value) 
                            }
                            //Special consideration for the total bar
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
                });
            
            
            bars.exit()
                .remove();

                if(lineShow == true)
                {
                    let lines = this.lineGroup
                    .selectAll(".aLine")
                    .data(viewModel.dataPoints);
        
                    lines.enter()
                        .append("line")
                        .classed("aLine", true);
                    
                    lines
                    .attr({
                        x1: 0 + this.settings.axis.y.padding,
                        x2: width,
                        y1: yScale(lineAmount),
                        y2: yScale(lineAmount),
                        stroke:"black",
                        "stroke-width":1
                    });
                }
                else{
                    let lines = this.lineGroup
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
                }
           
                
         
            
        }
        
        private updateSettings(options:VisualUpdateOptions)
        {
            this.settings.line.hidden.value = DataViewObjects.getValue(
                options.dataViews[0].metadata.objects,{
                    objectName: "lines",
                    propertyName: "show"
                },
            this.settings.line.hidden.default);

            this.settings.line.amount.value = DataViewObjects.getValue(
                options.dataViews[0].metadata.objects,{
                    objectName: "lines",
                    propertyName: "value"
                },
                this.settings.line.amount.default);
        }

        private getViewModel(options: VisualUpdateOptions): ViewModel {

            //pulls in data
            let dv = options.dataViews;

            let viewModel: ViewModel = {
                dataPoints: [],
                maxValue: 0,
                minValue: 0,
                highlights: false
            };

            if (!dv
                || !dv[0]
                || !dv[0].categorical
                || !dv[0].categorical.categories
                || !dv[0].categorical.categories[0].source
                || !dv[0].categorical.values)
                return viewModel;

            let view = dv[0].categorical;
            let categories = view.categories[0];
            let values = view.values[0];
            let highlights = values.highlights;
            
            //pushes datapoints to the viewmodel
            for (let i = 0, len = Math.max(categories.values.length, values.values.length); i < len+1; i++) {
                
                if(i<len)
                {
                    viewModel.dataPoints.push({
                   
                        category: <string>categories.values[i],
                        value: <number>values.values[i],
                        colour: getColour(<number>values.values[i]),
                        identity: this.host.createSelectionIdBuilder()
                            .withCategory(categories, i)
                            .createSelectionId(),
                        highlighted: highlights ? highlights[i] ? true : false : false
                    });
                    
                }
                //Special consideration for total bar
                //will need to be done better when doing sub totals
                else if(i = len)
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

                }

            }

            

            viewModel.maxValue = d3.max(viewModel.dataPoints, d => d.value);
            viewModel.minValue = d3.min(viewModel.dataPoints,d => d.value)
            viewModel.highlights = viewModel.dataPoints.filter(d => d.highlighted).length > 0;

            return viewModel;
        }

        public enumerateObjectInstances(options: EnumerateVisualObjectInstancesOptions):
        VisualObjectInstanceEnumeration{
            let propertyGroupName = options.objectName;
            let properties: VisualObjectInstance[] = [];

            switch (propertyGroupName)
            {
                case "lines":
                properties.push({
                    objectName: propertyGroupName,
                    properties: {
                        show: this.settings.line.hidden.value,
                        value: this.settings.line.amount.value
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
                        colour:"#000000",
                        identity: null,
                        highlighted:false
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
    
    
}

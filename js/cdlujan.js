/**
 * Visualización para la asignatura Data Visualization II del máster de Data Science & Big Data del centro U-TAD. Curso 2.018/19.
 * 
 * cdlujan - Jul'19.
 */

////////////////////////////////////////////////////////////////////////////
// Time play variables.
var MIN_YEAR;
var MAX_YEAR;
var START_YEAR = 1801; //1900;
var CURR_YEAR = START_YEAR - 1;
var PAUSED = false;
var FINISHED = false;
var SPEED = 1000 * 1.05;

var bisectDate = d3.bisector(function(d, x) { return d.date - x; }).left;
var numberFormat = d3.format(".2f");
var yearFormat = function(year) {
    return d3.format(",d")(year).replace(',', '.');
};

var formatCurrency = function(x) {
    return currency_units(d3.format(".2s")(x) + "$");
}

var formatCurrency0 = function(x) {
    return currency_units(d3.format(".0s")(x) + "$");
}

var currency_units = function(str) {
    return str.replace("K", "k")
        .replace("M", "m")
        .replace("G", "b")
        .replace("T", "t");
}

var formatPopulation = function(x) {
    return d3.format(".2s")(x);
}

var formatPercentage = function(x) {
    return d3.format(".2f")(x) + "%";
}

var formatPercentage0 = function(x) {
    return d3.format(".0f")(x) + "%";
}

var formatYears = function(x) {
    return d3.format(".2f")(x) + "y";
}

var formatYears0 = function(x) {
        return d3.format(".0f")(x) + "y";
    }
    ////////////////////////////////////////////////////////////////////////////
    // Small multiples variables. Vital signs chart.
var dim_factor = 8 / 7; //4/3;
// set the dimensions and margins of each multiple
var margin_small = { top: 20, right: 15, bottom: 20, left: 30 },
    width_small = 205 - margin_small.left - margin_small.right,
    height_small = 150 - margin_small.top - margin_small.bottom; //width_small/dim_factor - margin_small.top - margin_small.bottom;

var margin_small_conflicts = { top: 1, right: 0, bottom: 1, left: 0 },
    width_small_conflicts,
    height_small_conflicts;

// scales
var formatAsYear = d3.timeFormat('%Y');

var formatDeaths = d3.format(".2s");

var x_date = d3.scaleTime(); // year.
var y_gdp = d3.scaleLinear(); // gdp_growth - percent.
var y_income = d3.scaleLinear(); // income_per_person - int
var y_population = d3.scaleLinear(); // gdp_growth - percent.
var y_life_expectancy = d3.scaleLinear(); // income_per_person - int

var y_conflicts_log = d3.scaleLog(); // deaths - log10.
var y_conflicts = d3.scaleLinear();
var opacity_conflicts = d3.scaleLinear();

////////////////////////////////////////////////////////////////////////////
// Lollipop variables. "#rank_chart"

// set the dimensions and margins of the lollipop chart
var margin_rank_chart = { top: 5, right: 30, bottom: 40, left: 90 },
    width_rank_chart = 350 - margin_rank_chart.left - margin_rank_chart.right,
    height_rank_chart = 230 - margin_rank_chart.top - margin_rank_chart.bottom;
var color_country_list = d3.schemeCategory10.concat(['chocolate', 'blueviolet', 'orangered', 'dodgerblue', 'limegreen', 'darkmagenta']);
//['silver','indianred','firebrick','darkred','orangered','chocolate','darkorange','orange','gold', 'limegreen', 'darkred', 'turquoise', 'springgreen', 'lightseagreen', 'darkturquoise', 'deepskyblue', 'steelblue', 'dodgerblue', 'cornflowerblue', 'blueviolet', 'darkorchid', 'darkmagenta']

// Scales.
var x_rank_chart = d3.scaleLinear(); // total gdp.
var y_rank_chart = d3.scaleBand(); // country.

////////////////////////////////////////////////////////////////////////////
// Data type transformations.
var parseTime = d3.timeParse("%Y");
// Parsing each column to correct types.
var row_converter = function(rawd) {
        return {
            date: parseTime(rawd.year),
            gdp_per_capita_yearly_growth: parseFloat(rawd.gdp_per_capita_yearly_growth),
            country: rawd.name,
            iso2_name: rawd.iso3166_1_alpha2,
            current_total_gdp: parseInt(rawd.current_total_gdp),
            year_total_gdp: parseInt(rawd.year_total_gdp),
            population: parseFloat(parseInt(rawd.population_total) / 1000000),
            income_per_person: parseInt(rawd.income_per_person),
            life_expectancy_at_birth: parseFloat(rawd.life_expectancy_at_birth),
            life_expectancy: parseFloat(rawd.life_expectancy_years),
            co2_emissions: parseFloat(rawd.yearly_co2_emissions_1000_tonnes),
            lat: parseFloat(rawd.latitude),
            long: parseFloat(rawd.longitude)
        };
    } // @end row_converter function

var conflicts_row_converter = function(rawd) {
        return {
            war_name: rawd.war_name,
            ccode: rawd.ccode,
            country: rawd.name,
            start_date: parseTime(rawd.start_year),
            end_date: parseTime(rawd.end_year),
            deaths: parseInt(rawd.deaths),
            lat: parseFloat(rawd.latitude),
            long: parseFloat(rawd.longitude)
        };
    } // @end conflicts_row_converter function

////////////////////////////////////////////////////////////////////////////
// To guarantee all data has been read.
var dataset;

////////////////////////////////////////////////////////////////////////////
// Let's the fun begins.

var rank_chart = function(data) {
        // "#rank_chart" : horizontal lollipop - year_total_gdp ~ country

        // Data join
        //var svg_map_charts = d3.select("#cdlujan_dataviz").select("#map_charts")
        //.select("#svg_map_bg")
        var svg_rank_chart = d3 //.select("#rank_chart")
            .select("#svg_map_bg")
            .append("svg")
            .attr("id", "svg_rank_chart")
            .attr("class", "svg_rank_chart")
            .attr("width", width_rank_chart + margin_rank_chart.left + margin_rank_chart.right)
            .attr("height", height_rank_chart + margin_rank_chart.top + margin_rank_chart.bottom)
            .append("g")
            .attr("transform", "translate(" + margin_rank_chart.left + "," + margin_rank_chart.top + ")");

        // Scales
        x_rank_chart = x_rank_chart
            .domain([0, d3.max(data, function(d, i) {
                var last_year_idx = d.values.length - 1;
                return d.values[i, last_year_idx].year_total_gdp;
            })])
            .range([0, width_rank_chart]);

        y_rank_chart = y_rank_chart
            .domain(data.map(function(d) { return d.key; }))
            .range([0, height_rank_chart])
            .padding(1);

        // color for country
        var color_country = d3.scaleOrdinal()
            .domain(data.map(function(d) { return d.key; }))
            .range(color_country_list); // Add colors to the d3 built-in scheme.


        // Axis
        // x-axis
        svg_rank_chart.append("g")
            .attr("class", "x_axis_rank_chart")
            .attr("id", "x_axis_rank_chart")
            .attr("transform", "translate(0," + height_rank_chart + ")")
            .call(d3.axisBottom(x_rank_chart))
            //.selectAll("text")
            //  .attr("transform", "translate(-10,0)rotate(-45)")
            //  .style("text-anchor", "end");
            // y-axis
        svg_rank_chart.append("g")
            .attr("class", "y_axis_rank_chart")
            .attr("id", "y_axis_rank_chart")
            .call(d3.axisLeft(y_rank_chart));

        // Data join.
        var curr_date = parseTime(CURR_YEAR);

        // One svg containing line+sweet
        svg_rank_chart = svg_rank_chart.selectAll("svg")
            .data(data)
            .enter()
            .append("svg")
            .attr("class", "svg_data")
            .attr("id", "svg_data")
            .append("g");

        // append line.
        svg_rank_chart.append("line")
            .attr("x2", function(d) {
                var idx = bisectDate(d.values, curr_date);
                return x_rank_chart(d.values[idx].year_total_gdp);
            })
            .attr("x1", x_rank_chart(0))
            .attr("y1", function(d) { return y_rank_chart(d.key); })
            .attr("y2", function(d) { return y_rank_chart(d.key); })
            .attr("stroke", "gold") //function(d){ return color_country(d.key) })
            .attr("stroke-width", 1.9)
            .attr("stroke-opacity", 0.75);
        // append circle.
        svg_rank_chart
            .append("g")
            .attr("class", "g_lollipop")
            .attr("id", "g_lollipop")
            .append("pattern")
            .attr("id", function(d, i) { return "flag_" + d.values[i].iso2_name; })
            .attr("class", "flag")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("patternContentUnits", "objectBoundingBox")
            .append("image")
            .attr("width", 1)
            .attr("height", 1)
            // xMidYMid: center the image in the circle
            // slice: scale the image to fill the circle
            .attr("preserveAspectRatio", "xMidYMid slice")
            .attr("xlink:href", function(d, i) {
                return "data/flags/" + d.values[i].iso2_name + ".svg";
            });

        svg_rank_chart.selectAll("#g_lollipop")
            .append("circle")
            .attr("id", function(d) { return "circle_flag_" + d.key; })
            .attr("class", "circle_flag")
            .attr("r", 5) //5.5)
            .attr("cx", function(d) {
                var idx = bisectDate(d.values, curr_date);
                return x_rank_chart(d.values[idx].year_total_gdp);
            })
            .attr("cy", function(d) { return y_rank_chart(d.key); })
            .attr("stroke", "silver")
            .attr("stroke-opacity", 0.5)
            .attr("stroke-width", 1.5)
            .attr("fill", function(d, i) {
                return "url(#flag_" + d.values[i].iso2_name + ")";
            });

        var width = width_rank_chart + margin_rank_chart.left + margin_rank_chart.right;
        var height = height_rank_chart + margin_rank_chart.bottom + margin_rank_chart.top;
        // Place the year under inspection.             
        d3.select("#svg_rank_chart")
            .append("text")
            .attr("class", "rank_chart_year")
            .attr("id", "rank_chart_year")
            .attr("text-anchor", "end")
            .attr("y", height / 2 + margin_rank_chart.top)
            .attr("x", width - margin_rank_chart.right / 2)
            .style("text-align", "right");

        // Title.
        d3.select("#svg_rank_chart")
            .append("text")
            .attr("class", "rank_chart_title")
            .attr("id", "rank_chart_title")
            .attr("text-anchor", "end")
            .attr("y", height - (margin_rank_chart.bottom * 5 / 4))
            .attr("x", width - margin_rank_chart.right / 2)
            .style("text-align", "right")
            //.style("font-style", "italic")
            .append("tspan")
            .attr("y", height - (margin_rank_chart.bottom * 18 / 10))
            .attr("x", width - margin_rank_chart.right / 2)
            //.style("font-weight", "bold")
            .style("font-size", "14px")
            .text("Total GDP")
            .append("tspan")
            .attr("y", height - (margin_rank_chart.bottom * 14 / 10))
            .attr("x", width - margin_rank_chart.right / 2)
            .style("font-weight", "normal")
            .style("font-style", "italic")
            .style("font-size", "10px")
            .text("(converted to international USD  ")
            .append("tspan")
            .attr("y", height - (margin_rank_chart.bottom * 1.1))
            .attr("x", width - margin_rank_chart.right / 2)
            .style("font-weight", "normal")
            .style("font-size", "10px")
            .style("font-style", "italic")
            .text(" using purchasing power parity rates).");

    } // @end rank_chart function

////////////////////////////////////////////////////////////////////////////
// Map variables. Vital signs chart.

// set the dimensions and margins of each multiple
var margin_map = { top: 30, right: 30, bottom: 30, left: 30 },
    width_map = 1360 - margin_map.left - margin_map.right,
    height_map = 768 - margin_map.top - margin_map.bottom;
// Map and projection
var map_projection = d3.geoMercator()
    .center([0, 0]) // GPS of location to zoom on
    .scale(250) // This is like the zoom
    .translate([width_map / 2 - 75, height_map / 2 + margin_map.top + 150]);

var geodata;
/*
    d3.json("data/map/world.geojson", function(error, data) {
        if (error) {
            console.log(error);
        }
        else {
            geodata = data;
        }
    });
*/
var map_bg_chart = function() {
        var svg_map = d3.select("#map_charts")
            .append("svg")
            //.select("#svg_map_bg")
            .attr("class", "svg_map_bg")
            .attr("id", "svg_map_bg")
            .attr("width", width_map + margin_map.left + margin_map.right)
            .attr("height", height_map + margin_map.top + margin_map.bottom)
            .on("dblclick", restart_story);
        //  Map frame.
        svg_map
            .append("rect")
            .attr("width", width_map + margin_map.left + margin_map.right)
            .attr("height", height_map + margin_map.top + margin_map.bottom)
            .style('stroke', 'black')
            .style('stroke-opacity', 0.8)
            .style('fill', 'black')
            .style('fill-opacity', 0.01);

        // Draw the map
        svg_map
            .append("g")
            .attr("class", "g_map_bg")
            .attr("id", "g_map_bg")
            .selectAll("path")
            .data(geodata.features)
            .enter()
            .append("path")
            .attr("fill", "#b8b8b8")
            .attr("d", d3.geoPath().projection(map_projection))
            .style("stroke", "none")
            .style("opacity", .3);
        // Ecuator reference line.
        svg_map
            .append("line")
            .attr("class", "ecuator_ref_line")
            .attr("id", "ecuator_ref_line")
            .attr("x1", 0)
            .attr("x2", width_map + margin_map.left + margin_map.right)
            .attr("y1", map_projection([0, 0])[1])
            .attr("y2", map_projection([0, 0])[1])
            .style("stroke", "silver")
            .style("stroke-opacity", 0.5)
            .style("stroke-width", 1.5)

        // Circles for each country's center.
        svg_map.selectAll("country_dashboard")
            .data(nested_data)
            .enter()
            .append("circle")
            .attr("class", "country_center")
            .attr("id", function(d) { return "country_center_" + d.key; })
            .attr("r", 5)
            .attr("cx", function(d, i) { return map_projection([d.values[i].long, d.values[i].lat])[0]; })
            .attr("cy", function(d, i) { return map_projection([d.values[i].long, d.values[i].lat])[1]; })
            .style('stroke', 'silver')
            .style('stroke-opacity', 0.4)
            .style('fill', 'silver')
            .style('opacity', 0.5);

        var d0 = new Date(2003, 0, 1);
        var d1 = new Date(2004, 0, 1);

        svg_map
            .append("defs")
            .append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width",
                width_map + margin_map.left + margin_map.right)
            .attr("height",
                height_map + margin_map.top + margin_map.bottom)
            .style('stroke', 'black')
            .style('stroke-opacity', 0)
            .style('fill', 'black')
            .style('fill-opacity', 0.05);
        /*
        svg_map.call(zoom)
            .transition()
                .duration(1500)
                    .call(zoom.transform, d3.zoomIdentity
                            .scale(width_small / (x_date(d1) - x_date(d0)))
                            .translate(-x_date(d0), 0));
        */
        anotate_map();
    } // @end map_bg_chart function.

var anotate_map = function() {
    var svg_map = d3.select("#svg_map_bg");

    svg_map
        .append("text")
        .attr("class", "cdlujan")
        .attr("x", width_map + margin_map.left + margin_map.right - 5)
        .attr("y", height_map + margin_map.top + margin_map.bottom - 5)
        .attr("text-anchor", "end")
        .text("cdlujan - Jul'19");
}
var nodes;

var get_nodes = function() {
        // 
        return nested_data.map(function(d, i) {
            var x_y_map_projection = map_projection([d.values[i].long, d.values[i].lat]);
            return { "key": d.key, "values": { "x": x_y_map_projection[0], "y": x_y_map_projection[1] } };
        });
    } // @end get_nodes function.

var forced_field_simulation = function() {
        // Force field to place dashboards.
        // - dashboards are attracted to its country long,lat.
        // - dashboards are repulsed by each other relative to their distance to each other.
        // - try with no collision.
        nodes = get_nodes();

        var height = (height_small + margin_small.top + margin_small.bottom);
        var width = (width_small + margin_small.left + margin_small.right);

        var force_charge_strength = 0;
        var force_center_strength = 1;
        var force_collision_strength = 0.1;
        var force_collision = width_small / 2 + 28; //Math.sqrt(Math.pow(height_small,2)+Math.pow(width_small, 2))/2;
        var force_field = d3.forceSimulation(nodes) //.alphaDecay(0.01)
            //.force("center", d3.forceCenter(width/2, height/2))
            //.force('charge', 
            //    d3.forceManyBody()
            //        .strength(force_charge_strength))
            .force("country_center_x",
                d3.forceX()
                .x(function(d, i) { return (d.values.x); })
                .strength(force_center_strength))
            .force("country_center_y",
                d3.forceY()
                .y(function(d, i) { return (d.values.y); })
                .strength(force_center_strength))
            .force("collision",
                d3.forceCollide()
                .radius(function(d, i) { return force_collision; })
                .strength(force_collision_strength))
            .force("radial_center",
                d3.forceRadial()
                .radius(1)
                .x(function(d, i) { return (d.values.x - width); })
                .y(function(d, i) { return (d.values.y - height); })
                .strength(force_center_strength))
            .on("tick", ticked);
    } // @end forced_field_simulation function.

var ticked = function() {
        var height = height_small + margin_small.top + margin_small.bottom;
        var width = width_small + margin_small.left + margin_small.right;

        var u = d3.select("#svg_map_bg")
            .selectAll('dash_boards')
            .data(nodes);

        // Move dashboards.
        var u = d3.select("#svg_map_bg").selectAll('.svg_dash_board')
            .data(nodes);

        u.enter()
            .merge(u)
            .attr("x", function(d, i) { return d.x - width / 2; })
            .attr("y", function(d, i) { return d.y - height / 2; });

        u.exit().remove();
    } // @end ticked function.

var current_year_indicator = function() {
        d3.select("#svg_map_bg")
            .append("text")
            .attr("class", "current_year_indicator")
            .attr("id", "current_year_indicator")
            .attr("text-anchor", "end")
            .attr("y", margin_map.top * 2)
            .attr("x", width_map + margin_map.left)
            .style("font-style", "italic")
            .style("font-family", "Strait")
            .style("font-size", "48px")
            .style("opacity", 0.6)
            .text(function() { return yearFormat(CURR_YEAR); });
    } // @end current_year_indicator function.

// set the dimensions and margins of each multiple
var margin_legend = { top: 20, right: 20, bottom: 20, left: 20 },
    width_legend = 185 - margin_legend.left - margin_legend.right,
    height_legend = 110 - margin_legend.top - margin_legend.bottom;

var vital_signs_legend = function() {

    var svg_map = d3.select("#cdlujan_dataviz")
        .select("#map_charts")
        .select("#svg_map_bg");

    var pos_x = margin_legend.left;
    var pos_y = margin_map.top + height_map + margin_map.bottom - margin_legend.bottom - height_legend;

    svg_map.append("g")
        .attr("class", "map_charts_legend")
        .attr("id", "map_charts_legend")
        .attr("transform", "translate(" + pos_x + "," + pos_y + ")")
        .append("rect")
        .attr("class", "legend_background")
        .attr("x", 0)
        .attr("y", 0)
        .attr("height", height_legend)
        .attr("width", width_legend);

    svg_legend = svg_map.selectAll(".map_charts_legend");


    var ve_legend_width = 14;
    var ve_legend_height = ve_legend_width * 9 / 16;
    var sep = height_legend * 0.1;
    var n_encodings = 4;
    var pos_ve_y = d3.range(n_encodings)
        .map(function(d, i) {
            return ((height_legend) * (n_encodings - i) / n_encodings) - 6 * margin_legend.top / 9;
        }).reverse();

    // life_expectancy_ve
    svg_legend.append("g")
        .attr("class", "g_life_expectancy")
        /*
        .append("rect")
            .attr("class", "legend_life_expectancy")
            .attr("x", sep)
            .attr("y", pos_ve_y[0])
            .attr("height", ve_legend_height)
            .attr("width", ve_legend_width);
        */
        .append("path")
        .attr("class", "legend_life_expectancy")
        .attr("d", function(d) {
            var y_1 = pos_ve_y[0] + sep;
            var y_0 = pos_ve_y[0] + ve_legend_height;

            return d3.area()
                .x(function(d) {
                    return d.x;
                })
                .y0(function(d) {
                    return d.y0;
                })
                .y1(function(d) {
                    return d.y1;
                })
                ([{ "x": sep, "y0": y_0, "y1": y_1 - ve_legend_height * 0.4 },
                    { "x": sep + ve_legend_width / 3, "y0": y_0, "y1": y_1 - ve_legend_height * 0.6 },
                    { "x": sep + 2 * ve_legend_width / 3, "y0": y_0, "y1": y_1 - ve_legend_height * 0.2 },
                    { "x": sep + ve_legend_width, "y0": y_0, "y1": y_1 - ve_legend_height * 0.8 },
                ].reverse());
        });
    svg_legend.select(".g_life_expectancy")
        .append("text")
        .attr("class", "legend_text")
        .attr("x", sep + ve_legend_width + sep)
        .attr("y", pos_ve_y[0] + ve_legend_height)
        .text("· Life expectancy (years).");
    // income_per_person_ve
    svg_legend.append("g")
        .attr("class", "g_legend_income")
        /*
            .append("rect")
                .attr("class", "legend_income_per_person")
                .attr("x", sep)
                .attr("y", pos_ve_y[1])
                .attr("height", ve_legend_height)
                .attr("width", ve_legend_width);
        */
        .append("path")
        .attr("class", "legend_income_per_person")
        .attr("d", function(d) {
            var y_1 = pos_ve_y[1] + sep;
            var y_0 = pos_ve_y[1] + ve_legend_height;

            return d3.area()
                .x(function(d) {
                    return d.x;
                })
                .y0(function(d) {
                    return d.y0;
                })
                .y1(function(d) {
                    return d.y1;
                })
                ([{ "x": sep, "y0": y_0, "y1": y_1 - ve_legend_height * 0.4 },
                    { "x": sep + ve_legend_width / 3, "y0": y_0, "y1": y_1 - ve_legend_height * 0.6 },
                    { "x": sep + 2 * ve_legend_width / 3, "y0": y_0, "y1": y_1 - ve_legend_height * 0.5 },
                    { "x": sep + ve_legend_width, "y0": y_0, "y1": y_1 - ve_legend_height * 0.7 },
                ].reverse());
        });

    svg_legend.select(".g_legend_income")
        .append("text")
        .attr("class", "legend_text")
        .attr("x", sep + ve_legend_width + sep)
        .attr("y", pos_ve_y[1] + ve_legend_height)
        .text("· Income per person (USD).");
    // gdp_growth_ve
    svg_legend.append("g")
        .attr("class", "g_legend_gdp_growth")
        /*
            .append("line")
                .attr("class", "legend_gdp_growth")
                .attr("x1", sep)
                .attr("x2", sep+ve_legend_width)
                .attr("y1", pos_ve_y[2]+ve_legend_height/2)
                .attr("y2", pos_ve_y[2]+ve_legend_height/2)
                    
        */
        .append("path")
        .attr("class", "legend_gdp_growth")
        .attr("d", function(d) {
            var y = pos_ve_y[2] + sep;

            return d3.line()
                .x(function(d) {
                    return d.x;
                })
                .y(function(d) {
                    return d.y;
                })
                ([{ "x": sep, "y": y - ve_legend_height * 0.3 },
                    { "x": sep + ve_legend_width / 3, "y": y - ve_legend_height * 0.5 },
                    { "x": sep + 2 * ve_legend_width / 3, "y": y - ve_legend_height * 0.2 },
                    { "x": sep + ve_legend_width, "y": y - ve_legend_height * 0.7 },
                ].reverse());
        });
    svg_legend.select(".g_legend_gdp_growth")
        .append("text")
        .attr("class", "legend_text")
        .attr("x", sep + ve_legend_width + sep)
        .attr("y", pos_ve_y[2] + ve_legend_height)
        .text("· GDP per capita yearly growth.");
    // conflicts_ve
    svg_legend.append("g")
        .attr("class", "g_conflicts")
        .append("rect")
        .attr("class", "legend_conflict_rect")
        .attr("x", sep)
        .attr("y", pos_ve_y[3])
        .attr("height", ve_legend_height)
        .attr("width", ve_legend_width);
    svg_legend.select(".g_conflicts")
        .append("text")
        .attr("class", "legend_text")
        .attr("x", sep + ve_legend_width + sep)
        .attr("y", pos_ve_y[3] + ve_legend_height)
        .text("· Conflict deaths.");
}

var map_chart = function(data) {
        map_bg_chart(); // Create background map.
        vital_signs_charts(data); // Create each vital signs chart.
        current_year_indicator(); // Place the year indicator.
        vital_signs_legend();
        forced_field_simulation(); // Place the vital signs charts.
    } // @end map_chart function

var vital_signs_charts = function(data) {

        ////////////////////////////////////////////////////////////////////
        // Add an svg element for each group. The will be one beside each other
        // and will go on the next row when no more room available.
        var svg_map_charts = d3.select("#cdlujan_dataviz").select("#map_charts")
            .select("#svg_map_bg")
            .selectAll("svg")
            .data(data)
            .enter()
            .append("svg")
            .attr("id", function(d) { return "svg_" + d.key; })
            .attr("class", "svg_dash_board")
            .attr("width", width_small + margin_small.left + margin_small.right)
            .attr("height", height_small + margin_small.top + margin_small.bottom)
            .append("g")
            .attr("id", function(d) { return "svg_g_" + d.key; })
            .attr("class", function(d) { return "svg_g_" + d.key; })
            .attr("transform", "translate(" + margin_small.left + "," + margin_small.top + ")");

        ////////////////////////////////////////////////////////////////////
        // Add titles
        // Prepare the country's flag.
        svg_map_charts
            .append("g")
            .attr("class", "g_header")
            .attr("id", "g_header")
            .append("pattern")
            .attr("id", function(d, i) { return "flag_" + d.values[i].iso2_name; })
            .attr("class", "flag")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("patternContentUnits", "objectBoundingBox")
            .append("image")
            .attr("width", 1)
            .attr("height", 1)
            // xMidYMid: center the image in the circle
            // slice: scale the image to fill the circle
            .attr("preserveAspectRatio", "xMidYMid slice")
            .attr("xlink:href", function(d, i) {
                return "data/flags/" + d.values[i].iso2_name + ".svg";
            });

        // Place the country's flag.
        svg_map_charts.selectAll("#g_header")
            .append("rect")
            .attr("id", function(d) { return "rect_flag_" + d.key; })
            .attr("class", "rect_flag")
            .attr("width", 15)
            .attr("height", 10)
            .attr("y", -14)
            .attr("x", 1)
            .attr("stroke", "silver")
            .attr("stroke-opacity", 0.5)
            .attr("stroke-width", 1.5)
            .attr("fill", function(d, i) {
                return "url(#flag_" + d.values[i].iso2_name + ")";
            });

        // Titles.
        svg_map_charts.selectAll("#g_header")
            .append("g")
            .attr("class", "g_title")
            .attr("id", function(d) { return "g_title_" + d.key; });
        // Place the country name.
        svg_map_charts.selectAll("#g_header").selectAll(".g_title")
            .append("text")
            .attr("class", "title_country")
            .attr("id", function(d) { return "title_country_" + d.key; })
            .attr("text-anchor", "start")
            .attr("y", -5)
            .attr("x", 20)
            .text(function(d) { return d.key; });
        // Place the year under inspection.             
        svg_map_charts.selectAll("#g_header").selectAll(".g_title")
            .append("text")
            .attr("class", "title_year")
            .attr("id", function(d) { return "title_year_" + d.key; })
            .attr("text-anchor", "end")
            .attr("y", -5)
            .attr("x", width_small)
            .style("text-align", "right");

        // Place conflict chart group elements.
        width_small_conflicts =
            width_small - margin_small_conflicts.left - margin_small_conflicts.right;
        height_small_conflicts =
            height_small - (height_small - margin_small.bottom) - margin_small_conflicts.top - margin_small_conflicts.bottom;

        // War conflicts groups and data join.
        var g_conflicts = svg_map_charts
            .selectAll("#g_conflicts")
            .data(function(d) {
                var country_key = d.key;
                return conflicts_nested_data.filter(
                    function(x) {
                        return x.key === country_key;
                    })
            })
            .enter()
            .append("g")
            .attr("class", "g_conflicts")
            .attr("id", function(d) { return "g_conflicts_" + d.key; })
            .attr("width", width_small_conflicts)
            .attr("height", height_small_conflicts)
            .attr("transform", "translate(" + 0 + "," + (height_small - margin_small.bottom) + ")");

        //////////////////////////////////////////////////////////////////////////////////
        // Scales.

        // Add X axis -> it is a date format
        x_date.domain([d3.min(dataset, function(d) { return d.date; }),
                d3.max(dataset, function(d) { return d.date; })
            ])
            .range([0, width_small]);

        // Create vertical divisions for various encodings at the same multiple.
        var encodings = 3;
        var height = height_small - margin_small.bottom;
        var sep = 6;
        var y_limits = d3.range(encodings)
            .map(function(d, i) {
                return [margin_small.top / 3 + height * (encodings - i) / encodings - sep, margin_small.top / 3 + height * (encodings - i - 1) / encodings + sep]
            }).reverse();

        // gdp_growth's Y axis
        y_gdp.domain(d3.extent(dataset, function(d) {
                return d.gdp_per_capita_yearly_growth;
            }))
            .range(y_limits[encodings - 1]);

        // income_per_person Y axis
        y_income.domain(d3.extent(dataset, function(d) {
                return d.income_per_person;
            }))
            .range(y_limits[encodings - 2]);
        /*
        // population's Y axis
        y_population.domain(d3.extent(dataset, function(d) { 
                                return d.population; 
                                }))
                        .range(y_limits[encodings-4]);
        */
        // income_per_person Y axis
        y_life_expectancy.domain(d3.extent(dataset, function(d) {
                return d.life_expectancy;
            }))
            .range(y_limits[encodings - 3]);

        // color for country
        var color_country = d3.scaleOrdinal()
            .domain(data.map(function(d) { return d.key }))
            .range(color_country_list);

        // conflict deaths Y axis. 
        y_conflicts.domain([0, d3.max(conflicts_dataset, function(d) {
                return d.deaths;
            })])
            //.range([0,height_small_conflicts-margin_small_conflicts.bottom - (height_small_conflicts/2+margin_small_conflicts.top)])
            .range([height_small_conflicts - margin_small_conflicts.bottom, height_small_conflicts / 2 + margin_small_conflicts.top]);
        //.range([height_small-margin_small.bottom/2+1, height_small-2]);//([height_small-margin_small.bottom,height_small-margin_small.bottom/2]);

        opacity_conflicts.domain(y_conflicts.domain())
            .range([0.1, 0.9]);


        ////////////////////////////////////////////////////////////////////
        // Axes.

        // small multiples x_axis
        x_axis = d3.axisBottom(x_date)
            .ticks(4)
            .tickFormat(formatAsYear);

        svg_map_charts.append("g")
            .attr("class", "x_axis")
            .attr("id", "x_axis")
            .attr("transform", "translate(0," + height_small + ")")
            .call(x_axis);
        y_axis_gdp_growth = d3.axisLeft(y_gdp)
            .ticks(1)
            .tickFormat(formatPercentage0);
        // small multiples y_axis gdp_growth
        svg_map_charts.append("g")
            .attr("class", "y_axis_gdp_growth")
            .attr("id", "y_axis_gdp_growth")
            .call(y_axis_gdp_growth); // axis configuration should be placed here.
        // small multiples y_axis income_per_person
        y_axis_income = d3.axisLeft(y_income)
            .tickFormat(formatCurrency0)
            .ticks(1);
        svg_map_charts.append("g")
            .attr("class", "y_axis_income")
            .attr("id", "y_axis_income")
            .call(y_axis_income);
        /*
        // small multiples y_axis population
        y_axis_population = d3.axisLeft(y_population)
                                    .tickFormat(formatPopulation)
                                    .ticks(1);
        svg_map_charts.append("g")
                        .attr("class", "y_axis_population")
                        .attr("id", "y_axis_population")
                        .call(y_axis_population); // axis configuration should be placed here.
        */
        // small multiples y_axis life expectancy
        y_axis_life_expectancy = d3.axisLeft(y_life_expectancy)
            .tickFormat(formatYears0)
            .ticks(1);
        svg_map_charts.append("g")
            .attr("class", "y_axis_life_expectancy")
            .attr("id", "y_axis_life_expectancy")
            .call(y_axis_life_expectancy);

        // small multiples y_axis conflict deaths.
        //svg_map_charts
        g_conflicts.append("g")
            .attr("class", "y_axis_conflict_deaths")
            .attr("id", "y_axis_conflict_deaths")
            .call(d3.axisLeft(y_conflicts)
                .ticks(2)
                .tickSize(4)
                .tickFormat(d3.format(".0s"))
                .tickValues([d3.max(conflicts_dataset,
                    function(d) {
                        return d.deaths;
                    })]));
        ////////////////////////////////////////////////////////////////////
        // Dataset columns visual encodings.

        gdp_growth_ve = {};
        income_per_person_ve = {};
        population_ve = {};
        life_expectancy_ve = {};
        nested_data.forEach(function(d) {
            gdp_growth_ve[d.key] = d3.line();
            income_per_person_ve[d.key] = d3.area();
            population_ve[d.key] = d3.area();
            life_expectancy_ve[d.key] = d3.area();
        });
        // year ~ gdp_growth : zero line reference.
        svg_map_charts.append("line")
            .attr("class", "gdp_growth_zero_line")
            .attr("id", function(d) { return "gdp_growth_zero_line_" + d.key; })
            .attr("x1", 0)
            .attr("x2", width_small)
            .attr("y1", y_gdp(0))
            .attr("y2", y_gdp(0));

        // year ~ gdp_growth : line chart.
        svg_map_charts.append("path")
            .attr("class", "gdp_growth")
            .attr("id", function(d) { return "gdp_growth_" + d.key; })
            .attr("fill", "none")
            //.attr("stroke", function(d){ return color_country(d.key); })
            //.attr("stroke-opacity", 0.75)
            //.attr("stroke-width", 1.2)//1.9)
            .attr("d", function(d) {
                return gdp_growth_ve[d.key]
                    .x(function(d) { return x_date(d.date); })
                    .y(function(d) { return y_gdp(d.gdp_per_capita_yearly_growth); })
                    (d.values)
            });

        // year ~ income_per_person : zero line reference.
        svg_map_charts.append("line")
            .attr("class", "income_zero_line")
            .attr("id", function(d) { return "income_zero_line_" + d.key; })
            .attr("x1", 0)
            .attr("x2", width_small)
            .attr("y1", y_income(0))
            .attr("y2", y_income(0));

        // year ~ income_per_person : area chart.
        svg_map_charts.append("path")
            .attr("class", "income_per_person")
            .attr("id", function(d) { return "income_per_person_" + d.key; })
            //.attr("fill", function(d){ return color_country(d.key); })
            //.attr("stroke", function(d){ return color_country(d.key); })
            .attr("d", function(d) {
                return income_per_person_ve[d.key]
                    .x(function(d) {
                        return x_date(d.date);
                    })
                    .y0(function(d) {
                        return y_income.range()[0];
                    })
                    .y1(function(d) {
                        return y_income(d.income_per_person);
                    })
                    (d.values);
            });
        // year ~ population : area chart.
        /*
        svg_map_charts.append("path")
                        .attr("class", "population")
                        .attr("id", function(d) { return "population_"+d.key; })
                        .attr("fill", function(d){ return color_country(d.key); })
                        .attr("stroke", function(d){ return color_country(d.key); })
                        .attr("d", function(d){
                                        return population_ve[d.key]
                                                    .x(function(d) { 
                                                        return x_date(d.date); 
                                                    })
                                                    .y0(function(d) { 
                                                        return y_population.range()[0]; 
                                                    })
                                                    .y1(function(d) { 
                                                        return y_population(d.population); 
                                                    })
                                                    (d.values); 
                                    });
        */
        // year ~ life_expectancy : zero line reference.
        svg_map_charts.append("line")
            .attr("class", "life_expectancy_zero_line")
            .attr("id", function(d) { return "life_expectancy_zero_line_" + d.key; })
            .attr("x1", 0)
            .attr("x2", width_small)
            .attr("y1", y_life_expectancy(0))
            .attr("y2", y_life_expectancy(0));
        // year ~ life expectancy : area chart.
        svg_map_charts.append("path")
            .attr("class", "life_expectancy")
            .attr("id", function(d) { return "life_expectancy_" + d.key; })
            //.attr("fill", function(d){ return color_country(d.key); })
            //.attr("stroke", function(d){ return color_country(d.key); })
            .attr("d", function(d) {
                return life_expectancy_ve[d.key]
                    .x(function(d) {
                        return x_date(d.date);
                    })
                    .y0(function(d) {
                        return y_life_expectancy.range()[0];
                    })
                    .y1(function(d) {
                        return y_life_expectancy(d.life_expectancy);
                    })
                    (d.values);
            });

        // year ~ conflict : zero line.
        g_conflicts.append("line")
            .attr("class", "conflict_deaths_zero_line")
            .attr("id", function(d) { return "conflict_deaths_zero_line_" + d.key; })
            .attr("x1", 0)
            .attr("x2", width_small_conflicts)
            .attr("y1", y_conflicts(0))
            .attr("y2", y_conflicts(0));

        // year ~ conflict : rectangle + text.
        var g_country_conflicts = g_conflicts.selectAll("#g_country_conflict")
            .data(function(d) {
                return d.values;
            })
            .enter()
            .append("g")
            .attr("class", "g_country_conflict")
            .attr("id", function(d) { return "g_country_conflict_" + d.key; });

        g_country_conflicts.append("rect")
            .attr("class", "conflict_rect")
            .attr("id", function(d) { return "conflict_rect_" + d.key })
            .attr("height", function(d) {
                return y_conflicts(0) - y_conflicts(d.values[0].deaths);
            })
            .attr("y", function(d) {
                return y_conflicts(d.values[0].deaths);
            })
            .attr("x", function(d) {
                return x_date(d.values[0].start_date);
            })
            .attr("width", 0);

        g_country_conflicts.append("text")
            .attr("class", "conflict_name")
            .attr("id", function(d) { return "conflict_name_" + d.key; })
            .attr("x", width_small_conflicts / 2)
            .attr("y", height_small_conflicts / 2 + margin_small_conflicts.top)
            .text(function(d) {
                var deaths = "unknown";
                if (d.values[0].deaths >= 10) {
                    deaths = formatDeaths(d.values[0].deaths);
                }
                return '"' + d.values[0].war_name + '" (Deaths: ' + deaths + ').';
            })
            .attr("display", "none");

        ////////////////////////////////////////////////////////////////////
        // Focus.
        var marker_radius = 3;
        // Focusing on mouseovers -- gdp_growth
        var focus_gdp = svg_map_charts.append("g")
            .attr("class", "focus_gdp_growth")
            .style("display", "none");
        // gdp_growth focus.
        focus_gdp.append("circle")
            .attr("class", "gdp_growth_marker")
            .attr("r", marker_radius)
            .attr("fill", function(d) { return color_country(d.key) });
        focus_gdp.append("text")
            .attr("class", "gdp_growth_value")
            .attr("text-anchor", "middle")
            .attr("dy", "-0.5em")

        // Focusing on mouseovers -- income_per_person
        var focus_income = svg_map_charts.append("g")
            .attr("class", "focus_income_per_person")
            .style("display", "none");
        // income_per_person focus.
        focus_income.append("circle")
            .attr("class", "income_per_person_marker")
            .attr("r", marker_radius)
            .attr("fill", function(d) { return color_country(d.key) });
        focus_income.append("text")
            .attr("class", "income_per_person_value")
            .attr("text-anchor", "middle")
            .attr("dy", "-0.5em");

        /*// Focusing on mouseovers -- population
        var focus_population = svg_map_charts.append("g")
	                    .attr("class", "focus_population")
	                    .style("display", "none");
        // population focus.
        focus_population.append("circle")
	            .attr("class", "population_marker")
                .attr("r", marker_radius)
	            .attr("fill", function(d){ return color_country(d.key) });
        focus_population.append("text")
	            .attr("class", "population_value")
	            .attr("text-anchor", "middle")
	            .attr("dy", "-0.5em");

        
        */
        // Focusing on mouseovers -- life_expectancy
        var focus_life_expectancy = svg_map_charts.append("g")
            .attr("class", "focus_life_expectancy")
            .style("display", "none");
        // population focus.
        focus_life_expectancy.append("circle")
            .attr("class", "life_expectancy_marker")
            .attr("r", marker_radius)
            .attr("fill", function(d) { return color_country(d.key) });
        focus_life_expectancy.append("text")
            .attr("class", "life_expectancy_value")
            .attr("text-anchor", "middle")
            .attr("dy", "-0.5em");

        /////////////////////////////////////////////////////////////////////
        // Mouse interactivity
        svg_map_charts
            .append("rect")
            .attr("class", "overlay")
            .attr("width", width_small + 3)
            .attr("height", height_small)
            .attr("opacity", 0.2)
            .on("mouseover", mouseover)
            .on("mouseout", mouseout)
            .on("mousemove", mousemove)
            .on("click", mouseclick);
    } // @end vital_signs_chart function


////////////////////////////////////////////////////////////////////////////////
// Zoom functions.
var x_axis;
var y_axis_gdp_growth;
var y_axis_income;
var y_axis_population;
var y_axis_life_expectancy;
var gdp_growth_ve;
var income_per_person_ve; // income_per_person visual encoding.
var population_ve; // population visual encoding.
var life_expectancy_ve; // life_expectancy visual encoding.
var xt;

var zoom = d3.zoom()
    .scaleExtent([1, 32])
    .translateExtent([
        [0, 0],
        [width_small, height_small]
    ])
    .extent([
        [0, 0],
        [width_small, height_small]
    ])
    .on("zoom", zoomed);

// area hay que cambiarlo. 
// añadir .line para otros datos.
function zoomed() {
    var t = d3.event.transform;
    xt = t.rescaleX(x_date);
    var g = d3.selectAll(".svg_dash_board");

    g.selectAll(".gdp_growth")
        .attr("d", function(d) {
            gdp_growth_ve[d.key].x(function(d) {
                return xt(d.date);
            })
        });
    ''

    g.selectAll(".income_per_person")
        .attr("d", function(d) {
            income_per_person_ve[d.key].x(function(d) {
                return xt(d.date);
            });
        });

    g.selectAll(".x_axis")
        .call(x_axis.scale(xt));
    //update_vital_signs_charts();
    console.log("zoomed");
}


////////////////////////////////////////////////////////////////////////////////
// Resort functions.
var resort = function() {
        // restort_small_multiples();
        resort_rank_chart();
    } // @ end of restort function

var restort_small_multiples = function() {
        var curr_date = parseTime(CURR_YEAR);

        var compare_gdp = (function(a, b) { // Sort by current_year total_gdp.

            var idx_a = bisectDate(a.values, curr_date);
            var idx_b = bisectDate(b.values, curr_date);

            return -(a.values[idx_a].year_total_gdp - b.values[idx_b].year_total_gdp);
        });

        d3.select("#cdlujan_dataviz").select("#map_charts")
            .selectAll("svg")
            .sort(compare_gdp); // sort by year_total_gdp
    } // @ end of restort_small_multiples function

var resort_rank_chart = function() {
        var curr_date = parseTime(CURR_YEAR);
        var y_rank_chart_new_domain = dataset.filter(function(d) {
                return (d.date - curr_date) == 0;
            })
            .sort(function(a, b) {
                return -(a.year_total_gdp - b.year_total_gdp);
            })
            .map(function(d) { return d.country });

        y_rank_chart.domain(y_rank_chart_new_domain);

        d3.select("#cdlujan_dataviz").select("#svg_rank_chart")
            .select("#y_axis_rank_chart")
            .transition()
            .duration(150)
            .call(d3.axisLeft(y_rank_chart).tickSize(4));
    } // @ end of resort_rank_chart function

////////////////////////////////////////////////////////////////////////////////
// Update chart functions.
var update_x_rank_chart_axis = function(x_rank_chart, x_rank_chart_new_domain) {
    var num_ticks = 4;
    var tick_values = d3.range(num_ticks + 1)
        .map(function(i) { // quantile intervals.
            return i / num_ticks;
        })
        .map(function(q) {
            return d3.quantile(x_rank_chart_new_domain, q);
        });
    tick_values[0] = 0;

    return d3.axisBottom(x_rank_chart)
        .tickFormat(formatCurrency)
        .ticks(3)
        .tickSize(4)
        .tickValues(tick_values);
}

var update_rank_chart = function() {
        var curr_date = parseTime(CURR_YEAR);

        var x_rank_chart_new_domain = d3.extent(dataset.filter(function(d) {
                return (d.date - curr_date) <= 0;
            })
            .map(function(d) { return d.year_total_gdp }));

        x_rank_chart.domain(x_rank_chart_new_domain);

        d3.select("#cdlujan_dataviz").select("#svg_rank_chart")
            .select("#x_axis_rank_chart")
            .transition()
            .duration(150)
            .call(update_x_rank_chart_axis(x_rank_chart, x_rank_chart_new_domain))
            //.selectAll("text")
            //    .attr("transform", "translate(-10,0)rotate(-45)")
            //    .style("text-anchor", "end");


        d3.select("#cdlujan_dataviz").select("#svg_rank_chart")
            .selectAll("#svg_data")
            .transition()
            .duration(function(d, i) { return i * 2000; }) //1000)
            .delay(function(d, i) { return i * 50; })
            .attr("display", function(d) {
                var idx = bisectDate(d.values, curr_date);
                if ((d.values[idx].date - curr_date) > 0) {
                    return "none";
                } else {
                    return "inherit";
                }
            })
            .each(function() {
                d3.select(this).selectAll("line")
                    .attr("x2", function(d) {
                        var idx = bisectDate(d.values, curr_date);
                        return x_rank_chart(d.values[idx].year_total_gdp);
                    })
                    .attr("x1", x_rank_chart(0))
                    .attr("y1", function(d) { return y_rank_chart(d.key); })
                    .attr("y2", function(d) { return y_rank_chart(d.key); })
                d3.select(this).selectAll("circle")
                    .attr("cx", function(d) {
                        var idx = bisectDate(d.values, curr_date);
                        return x_rank_chart(d.values[idx].year_total_gdp);
                    })
                    .attr("cy", function(d) { return y_rank_chart(d.key); })
            });

        update_rank_chart_focus();
    } // @ end of update_rank_chart function

var update_rank_chart_focus = function() {
    // Titles
    var year_text = d3.select("#svg_rank_chart").select("#rank_chart_year");

    if (PAUSED == true) {
        //titles.text(function(d, i){ return ("Population: "+numberFormat(d.values[i, bisectDate(d.values, curr_date)].population)+"·10⁶"); });
        year_text.text(function(d, i) { return "Year: " + yearFormat(CURR_YEAR); });
    } else {
        year_text.text("");
    }
}

var update_map_charts = function() {
    update_vital_signs_charts();
}

var update_x_date_axis = function(x_date) {
    return d3.axisBottom(x_date)
        .ticks(4)
        .tickFormat(formatAsYear)
        .tickSize(4);
}

var update_y_gdp_growth_axis = function(y_gdp, y_gdp_new_domain) {
    return d3.axisLeft(y_gdp)
        .ticks(3)
        .tickFormat(formatPercentage0)
        .tickSize(4)
        .tickValues([d3.min(y_gdp_new_domain),
            //0, 
            d3.max(y_gdp_new_domain)
        ]);
}

var update_y_income_axis = function(y_income, y_income_new_domain) {
    return d3.axisLeft(y_income)
        .tickFormat(formatCurrency0)
        .ticks(3)
        .tickSize(4)
        .tickValues([0, d3.max(y_income_new_domain)]);
}

var update_y_population_axis = function(y_population, y_population_new_domain) {
    return d3.axisLeft(y_population)
        .tickFormat(formatPopulation)
        .ticks(3)
        .tickSize(4)
        .tickValues([0, d3.max(y_population_new_domain)]);
}

var update_y_life_expectancy_axis = function(y_life_expectancy, y_life_expectancy_new_domain) {
    return d3.axisLeft(y_life_expectancy)
        .tickFormat(formatYears0)
        .ticks(3)
        .tickSize(4)
        .tickValues([0, d3.max(y_life_expectancy_new_domain)]);
}

var update_vital_signs_charts_gdp_growth = function(curr_date, filtered_data) {
    // Update y-axis -- gdp_growth
    var y_gdp_new_domain = d3.extent(filtered_data.map(function(d) { return d.gdp_per_capita_yearly_growth }));

    y_gdp.domain(y_gdp_new_domain);

    d3.select("#cdlujan_dataviz").select("#map_charts")
        .selectAll("#y_axis_gdp_growth")
        .transition()
        .duration(150)
        .call(update_y_gdp_growth_axis(y_gdp, y_gdp_new_domain));

    // Update line.
    d3.select("#cdlujan_dataviz").select("#map_charts")
        .selectAll(".gdp_growth")
        .transition()
        .duration(150)
        .attr("d", function(d) {
            return gdp_growth_ve[d.key]
                .x(function(d) { return x_date(d.date); })
                .y(function(d) { return y_gdp(d.gdp_per_capita_yearly_growth); })
                (d.values.filter(function(d) {
                        return (d.date - curr_date) <= 0;
                    })
                    .filter(function(d) {
                        return (d.date - parseTime(START_YEAR)) >= 0;
                    }));
        });

    // Update zero line.
    d3.select("#cdlujan_dataviz").select("#map_charts")
        .selectAll(".gdp_growth_zero_line")
        .transition()
        .duration(150)
        .attr("y1", y_gdp(0))
        .attr("y2", y_gdp(0));
}

var update_vital_signs_charts_income_per_person = function(curr_date, filtered_data) {
    // Update y-axis -- income_per_person
    var y_income_new_domain = [0, d3.max(filtered_data.map(function(d) { return d.income_per_person }))];

    y_income.domain(y_income_new_domain);

    d3.select("#cdlujan_dataviz").select("#map_charts")
        .selectAll("#y_axis_income")
        .transition()
        .duration(150)
        .call(update_y_income_axis(y_income, y_income_new_domain));

    // Update line.
    d3.select("#cdlujan_dataviz").select("#map_charts")
        .selectAll(".income_per_person")
        .transition()
        .duration(150)
        .attr("d", function(d) {
            return income_per_person_ve[d.key]
                .x(function(d) { return x_date(d.date); })
                .y0(function(d) {
                    return y_income.range()[0];
                })
                .y1(function(d) {
                    return y_income(d.income_per_person);
                })
                (d.values.filter(function(d) {
                        return (d.date - curr_date) <= 0;
                    })
                    .filter(function(d) {
                        return (d.date - parseTime(START_YEAR)) >= 0;
                    })
                    .filter(function(d) {
                        return d.income_per_person >= 0;
                    }));

        });

    // Update zero line.
    d3.select("#cdlujan_dataviz").select("#map_charts")
        .selectAll(".income_zero_line")
        .transition()
        .duration(150)
        .attr("y1", y_income(0))
        .attr("y2", y_income(0));
}

var update_vital_signs_charts_population = function(curr_date, filtered_data) {
    // Update y-axis -- income_per_person
    var y_population_new_domain = [0, d3.max(filtered_data.map(function(d) { return d.population }))];

    y_population.domain(y_population_new_domain);

    d3.select("#cdlujan_dataviz").select("#map_charts")
        .selectAll("#y_axis_population")
        .transition()
        .duration(150)
        .call(update_y_population_axis(y_population, y_population_new_domain));

    // Update line.
    d3.select("#cdlujan_dataviz").select("#map_charts")
        .selectAll(".population")
        .transition()
        .duration(150)
        .attr("d", function(d) {
            return population_ve[d.key]
                .x(function(d) { return x_date(d.date); })
                .y0(function(d) {
                    return y_population.range()[0];
                })
                .y1(function(d) {
                    return y_population(d.population);
                })
                (d.values.filter(function(d) {
                        return (d.date - curr_date) <= 0;
                    })
                    .filter(function(d) {
                        return (d.date - parseTime(START_YEAR)) >= 0;
                    })
                    .filter(function(d) {
                        return d.population >= 0;
                    }));

        });
}

var update_vital_signs_charts_life_expectancy = function(curr_date, filtered_data) {

    // Update y-axis -- life_expectancy
    var y_life_expectancy_new_domain = [0, d3.max(filtered_data.map(function(d) { return d.life_expectancy }))];

    y_life_expectancy.domain(y_life_expectancy_new_domain);

    d3.select("#cdlujan_dataviz").select("#map_charts")
        .selectAll("#y_axis_life_expectancy")
        .transition()
        .duration(150)
        .call(update_y_life_expectancy_axis(y_life_expectancy, y_life_expectancy_new_domain));

    // Update line.
    d3.select("#cdlujan_dataviz").select("#map_charts")
        .selectAll(".life_expectancy")
        .transition()
        .duration(150)
        .attr("d", function(d) {
            return life_expectancy_ve[d.key]
                .x(function(d) { return x_date(d.date); })
                .y0(function(d) {
                    return y_life_expectancy.range()[0];
                })
                .y1(function(d) {
                    return y_life_expectancy(d.life_expectancy);
                })
                (d.values.filter(function(d) {
                        return (d.date - curr_date) <= 0;
                    })
                    .filter(function(d) {
                        return (d.date - parseTime(START_YEAR)) >= 0;
                    })
                    .filter(function(d) {
                        return d.life_expectancy >= 0;
                    }));

        });

    // Update zero line.
    d3.select("#cdlujan_dataviz").select("#map_charts")
        .selectAll(".life_expectancy_zero_line")
        .transition()
        .duration(150)
        .attr("y1", y_life_expectancy(0))
        .attr("y2", y_life_expectancy(0));
}

var update_y_conflicts_axis = function(y_conflicts, y_conflicts_new_domain) {
    return d3.axisLeft(y_conflicts)
        .tickFormat(d3.format(".0s"))
        .ticks(3)
        .tickSize(4)
        .tickValues([d3.max(y_conflicts_new_domain)]);
}

var update_vital_signs_charts_conflicts = function(curr_date) {
    var filtered_conflicts_data = conflicts_dataset.filter(function(d) {
            return (d.start_date - curr_date) <= 0;
        })
        .filter(function(d) {
            return (d.start_date - parseTime(START_YEAR)) >= 0;
        });

    // Update y-axis -- conflicts
    var y_conflicts_new_domain = [0, 0];
    if (filtered_conflicts_data.length > 0) {
        y_conflicts_new_domain = [0, d3.max(filtered_conflicts_data, function(d) { return d.deaths })];
    }

    y_conflicts.domain(y_conflicts_new_domain);

    d3.select("#cdlujan_dataviz").select("#map_charts")
        .selectAll("#y_axis_conflict_deaths")
        .transition()
        .duration(150)
        .call(update_y_conflicts_axis(y_conflicts, y_conflicts_new_domain));

    // Update conflicts.
    var g_conflicts = d3.select("#cdlujan_dataviz").select("#map_charts").selectAll(".g_conflicts");

    d3.selectAll(".conflict_rect")
        .transition()
        .duration(150)
        .attr("x", function(d) {
            return x_date(d.values[0].start_date);
        })
        .attr("width", function(d) {
            var width = 0;

            if ((d.values[0].start_date - parseTime(START_YEAR)) >= 0) {
                if ((curr_date - d.values[0].end_date) >= 0) {
                    width = x_date(d.values[0].end_date) - x_date(d.values[0].start_date);
                    if (width == 0) {
                        width = 1;
                    }
                } else {
                    width = x_date(curr_date) - x_date(d.values[0].start_date);
                }
            }

            return width;
        })
        .attr("height", function(d) {
            var height = 0;

            if (((d.values[0].start_date - parseTime(START_YEAR)) >= 0) && ((curr_date - d.values[0].start_date) >= 0)) {
                height = y_conflicts(0) - y_conflicts(d.values[0].deaths);
            }

            return height;
        })
        .attr("y", function(d) {
            var y = 0;

            if (((d.values[0].start_date - parseTime(START_YEAR)) >= 0) && ((curr_date - d.values[0].start_date) >= 0)) {
                y = y_conflicts(d.values[0].deaths);
            }

            return y;
        });
    d3.selectAll(".conflict_name")
        .attr("display", function(d) {
            var result = "none";

            if ((curr_date - d.values[0].start_date) >= 0 &&
                (d.values[0].end_date - curr_date) >= 0) {
                result = 'inherit';
            }

            return result;
        })
        .transition()
        /*
        .duration(function(d) {
            return (d.values[0].end_date-d.values[0].start_date)*200;//d.values[0].deaths;
        })
        .delay(function(d) {
            return (d.values[0].end_date-d.values[0].start_date)*200;
        })
        */
        .duration(500)
        .delay(function(d) {
            return (d.values[0].end_date - d.values[0].start_date) * 300;
        })
        .attr("display", "none");
}

var update_vital_signs_charts = function() {
        var curr_date = parseTime(CURR_YEAR);

        var filtered_data = dataset.filter(function(d) {
                return (d.date - curr_date) <= 0;
            })
            .filter(function(d) {
                return (d.date - parseTime(START_YEAR)) >= 0;
            });
        // Update x-axis.
        var x_date_new_domain = d3.extent(filtered_data.map(function(d) { return d.date }));

        x_date.domain(x_date_new_domain);
        // x_axis = update_x_date_axis(x_date);
        x_axis.scale(x_date);

        d3.select("#cdlujan_dataviz").select("#map_charts")
            .selectAll("#x_axis")
            //.transition()
            //    .duration(150)
            .call(x_axis);

        // Update charts to current year.
        update_vital_signs_charts_gdp_growth(curr_date, filtered_data);
        update_vital_signs_charts_income_per_person(curr_date, filtered_data);
        //update_vital_signs_charts_population(curr_date, filtered_data);
        update_vital_signs_charts_life_expectancy(curr_date, filtered_data);

        update_vital_signs_charts_conflicts(curr_date);

        update_vital_signs_focus();
    } // @end of update_vital_signs_charts function.


var update_vital_signs_focus_gdp_growth = function(curr_date) {
    var focus = d3.selectAll(".focus_gdp_growth");

    focus.style("display", null);

    focus.select(".gdp_growth_marker")
        .attr("cx", x_date(curr_date))
        .attr("cy", function(d, i) {
            var idx = bisectDate(d.values, curr_date);
            var value = d.values[i, idx].gdp_per_capita_yearly_growth;
            if ((curr_date - d.values[i, idx].date) < 0) {
                value = 0;
            }

            return y_gdp(value);
        });

    focus.select(".gdp_growth_value")
        .attr("x", x_date(curr_date))
        .attr("y", function(d, i) {
            return y_gdp(d.values[i, bisectDate(d.values, curr_date)].gdp_per_capita_yearly_growth);
        })
        //.text(function(d, i) { return numberFormat(d.values[i, bisectDate(d.values, curr_date)].gdp_per_capita_yearly_growth); });
        .text(function(d, i) {
            var result = "";
            var idx = bisectDate(d.values, curr_date);
            var value = d.values[i, idx].gdp_per_capita_yearly_growth;
            if ((curr_date - d.values[i, idx].date) >= 0) {
                result = formatPercentage(value);
            }
            return result;
        });
}

var update_vital_signs_focus_income_per_person = function(curr_date) {
    var focus = d3.selectAll(".focus_income_per_person");

    focus.style("display", null);

    focus.select(".income_per_person_marker")
        .attr("cx", x_date(curr_date))
        .attr("cy", function(d, i) {
            var idx = bisectDate(d.values, curr_date);
            var value = d.values[i, idx].income_per_person;
            if (value < 0 || ((d.values[i, idx].date - curr_date) > 0)) {
                value = 0;
            }

            return y_income(value);
        });

    focus.select(".income_per_person_value")
        .attr("x", x_date(curr_date))
        .attr("y", function(d, i) {
            return y_income(d.values[i, bisectDate(d.values, curr_date)].income_per_person);
        })
        .text(function(d, i) {
            var result = "";
            var idx = bisectDate(d.values, curr_date);
            var value = d.values[i, idx].income_per_person;
            if (value > 0 && ((curr_date - d.values[i, idx].date) >= 0)) {
                result = formatCurrency(value);
            }
            return result;
        });
}

var update_vital_signs_focus_population = function(curr_date) {
    var focus = d3.selectAll(".focus_population");

    focus.style("display", null);

    focus.select(".population_marker")
        .attr("cx", x_date(curr_date))
        .attr("cy", function(d, i) {
            var value = d.values[i, bisectDate(d.values, curr_date)].population;
            if (value < 0) {
                value = 0;
            }

            return y_population(value);
        });

    focus.select(".population_value")
        .attr("x", x_date(curr_date))
        .attr("y", function(d, i) {
            return y_population(d.values[i, bisectDate(d.values, curr_date)].population);
        })
        .text(function(d, i) {
            var result = "";
            var idx = bisectDate(d.values, curr_date);
            var value = d.values[i, idx].population;
            if (value > 0 && ((curr_date - d.values[i, idx].date) >= 0)) {
                result = numberFormat(value);
            }
            return result;
        });
}

var update_vital_signs_focus_life_expectancy = function(curr_date) {
    var focus = d3.selectAll(".focus_life_expectancy");

    focus.style("display", null);

    focus.select(".life_expectancy_marker")
        .attr("cx", x_date(curr_date))
        .attr("cy", function(d, i) {
            var idx = bisectDate(d.values, curr_date);
            var value = d.values[i, idx].life_expectancy;
            if (value < 0 || ((d.values[i, idx].date - curr_date) > 0)) {
                value = 0;
            }

            return y_life_expectancy(value);
        });

    focus.select(".life_expectancy_value")
        .attr("x", x_date(curr_date))
        .attr("y", function(d, i) {
            return y_life_expectancy(d.values[i, bisectDate(d.values, curr_date)].life_expectancy);
        })
        .text(function(d, i) {
            var result = "";
            var idx = bisectDate(d.values, curr_date);
            var value = d.values[i, idx].life_expectancy;
            if (value > 0 && ((curr_date - d.values[i, idx].date) >= 0)) {
                result = formatYears(value);
            }
            return result;
        });
}

var update_vital_signs_focus_titles = function() {
    // Titles
    var titles = d3.select("#cdlujan_dataviz")
        .select("#map_charts")
        .selectAll("svg")
        .selectAll(".title_year");

    if (PAUSED == true) {
        titles.text(function(d, i) {
            return "Year: " + yearFormat(CURR_YEAR);
        });
    } else {
        titles.text("");
    }
}

var update_vital_signs_focus_conflicts = function(curr_date) {
    // conflicts.
    d3.selectAll(".conflict_name")
        .transition()
        .duration(1000)
        .delay(function(d) {
            return (Math.random() < 0.5) * 500;
        })
        .attr("display", function(d) {
            var result = "none";

            if ((curr_date - d.values[0].start_date) >= 0 &&
                (d.values[0].end_date - curr_date) >= 0) {
                if (d3.select(this).attr("display") === "none" && (Math.random() < 0.8)) {
                    result = 'inherit';
                }
            }

            return result;
        })
        .transition()
        .duration(1000)
        .delay(function(d) {
            return (Math.random() < 0.5) * 500;
        })
        .attr("display", function(d) {
            var result = d3.select(this).attr("display");

            if ((result === 'inherit') && (Math.random() < 0.4)) {
                result = 'none';
            }

            return result;
        });
}

var update_vital_signs_focus = function() {
        var curr_date = parseTime(CURR_YEAR);
        // Tick focus markers
        update_vital_signs_focus_gdp_growth(curr_date);
        update_vital_signs_focus_income_per_person(curr_date);
        //update_vital_signs_focus_population(curr_date);
        update_vital_signs_focus_life_expectancy(curr_date);

        //update_vital_signs_focus_conflicts(curr_date);    
        update_vital_signs_focus_titles();
    } // @end of update_vital_signs_focus function.

var update_year = function() {
    d3.select("#current_year_indicator")
        .text(function() { return yearFormat(CURR_YEAR); });
}

var timer = function() {
        if (!PAUSED && !FINISHED) {
            CURR_YEAR = CURR_YEAR + 1;
            //d3.select("#yearvalue").text(CURR_YEAR);

            // Resort accordingly
            setTimeout(resort(), SPEED);

            // Update year indicator
            update_year();
            // Update charts.
            setTimeout(update_rank_chart(), SPEED);
            setTimeout(update_map_charts(), SPEED);

            // Restarting if necesary.
            if (CURR_YEAR == MAX_YEAR) {
                CURR_YEAR = START_YEAR - 1;
                PAUSED = true;
                FINISHED = true;
                setTimeout(timer, SPEED * 5);
            } else {
                //setTimeout(timer, SPEED);
                setTimeout(timer, SPEED / (Math.log10(CURR_YEAR - START_YEAR + 1) + 1));
                //console.log(SPEED/(Math.log10(CURR_YEAR-START_YEAR+1)+1));
            }
        }
        //PAUSED = true;
        return true;
    } // @end of timer function.

////////////////////////////////////////////////////////////////////////////////
// Mouse interactions. Tooltip

var STOP_YEAR = CURR_YEAR;
var mouse_clicked = false;

var mouseover = function() {
        /*
        if (PAUSED) {
            focus.style("display", null);
        }
        */
        PAUSED = true;
        STOP_YEAR = CURR_YEAR;
    } // @end of mouseover function

var mouseout = function() {
        // If there is story, continue.
        if (!FINISHED) {
            PAUSED = false;
            if (mouse_clicked == false) {
                CURR_YEAR = STOP_YEAR;
            } else {
                mouse_clicked = false;
            }
            timer();
        }
    } // @end of mouseout function

var mouseclick = function() {
        // Get x_axis value for mouse position.
        var xmove = x_date.invert(d3.mouse(this)[0]);
        // Use it as new current year for the story.
        START_YEAR = xmove.getFullYear();
        CURR_YEAR = START_YEAR - 1;
        STOP_YEAR = CURR_YEAR;
        // continue story.
        PAUSED = false;
        FINISHED = false;
        mouse_clicked = true;
        timer();
    } // @end of mouseclick function

var mousemove = function() {
        if (PAUSED) {
            // Get x_axis value for mouse position.
            var mouse_x_pos = d3.mouse(this)[0];
            if (mouse_x_pos)
                var xmove = x_date.invert(d3.mouse(this)[0]);
            // Use it as new current year for the story.
            if (CURR_YEAR != xmove.getFullYear()) {
                CURR_YEAR = xmove.getFullYear();
                if (CURR_YEAR > MAX_YEAR) {
                    CURR_YEAR = MAX_YEAR;
                }
                // Resort and update charts.
                resort();
                update_rank_chart();
                update_vital_signs_focus();
                update_vital_signs_focus_conflicts(parseTime(CURR_YEAR));
                update_rank_chart_focus();
            }
        }
    } // @end of mousemove function.

var restart_story = function() {
    START_YEAR = MIN_YEAR;
    CURR_YEAR = START_YEAR - 1;
    STOP_YEAR = CURR_YEAR;
    // Restart the story.
    PAUSED = false;
    FINISHED = false;
    mouse_clicked = true;
    timer();
}


var nested_data;

/*
    //Read the data -- privacy.file_unique_origin en about:config para Firefox for file://.
    d3.csv("data/data_top15_by_year.csv", row_converter, function(error, data) {
        if (error) {
            console.log(error);
        }
        else {
        ////////////////////////////////////////////////////////////////////
        // Data preparation.
            dataset = data; // To guarantee all data has been read.

            // List of years in the dataset.
            var years = dataset.map(function (d) {
                                        return d.date.getFullYear();
                                });
            MIN_YEAR = d3.min(years);
            MAX_YEAR = d3.max(years);

            // Nest data by country.
            nested_data = d3.nest().key(function(d) {
              return d.country;
            }).sortValues(function(a, b) {
              return d3.ascending(a.date, b.date);
            }).entries(dataset);

        ////////////////////////////////////////////////////////////////////
        // Create visualizations.
            rank_chart(nested_data);
            map_chart(nested_data);

        ////////////////////////////////////////////////////////////////////
        // Story telling.
            resort();
	        timer();
      } // @end of callback function.
    }) // @end of d3.csv function.
*/
d3.queue()
    .defer(d3.json, "data/map/world.geojson") //custom.geo.json")  // World shape
    .defer(d3.csv, "data/data_top15_by_year.csv", row_converter) // Dataset.
    .defer(d3.csv, "data/conflicts_top15.csv", conflicts_row_converter) // Dataset.
    .await(ready);

var conflicts_dataset;
var conflicts_nested_data;

var conflicts_chart = function(conflicts_nested_data) {
    //console.log(conflicts_dataset);
    //console.log(conflicts_dataset[0].deaths);
}

function ready(error, geojson_data, data, conflicts_data) {
    if (error) {
        console.log(error);
    } else {

        ////////////////////////////////////////////////////////////////////
        // Data preparation.

        geodata = geojson_data;
        dataset = data; // To guarantee all data has been read.
        conflicts_dataset = conflicts_data;

        // List of years in the dataset.
        var years = dataset.map(function(d) {
            return d.date.getFullYear();
        });

        MIN_YEAR = d3.min(years);
        MAX_YEAR = d3.max(years);

        // Nest data by country.
        nested_data = d3.nest()
            .key(function(d) {
                return d.country;
            })
            .sortValues(function(a, b) {
                return d3.ascending(a.date, b.date);
            }).entries(dataset);
        // for conflicts
        conflicts_nested_data = d3.nest()
            .key(function(d) {
                return d.country;
            })
            .key(function(d) {
                return d.war_name;
            })
            .sortValues(function(a, b) {
                return d3.ascending(a.start_date, b.start_date);
            }).entries(conflicts_dataset);

        ////////////////////////////////////////////////////////////////////
        // Create visualizations.
        map_chart(nested_data);
        rank_chart(nested_data);
        conflicts_chart(conflicts_nested_data);

        ////////////////////////////////////////////////////////////////////
        // Story telling.
        resort();
        timer();
    } // @end of callback function.
}
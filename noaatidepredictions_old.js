//robert.aspinall@noaa.gov

//The main chart object.  All plotting operations are performed on this.
var chart;
var options;
//The datum chart
var datumchart;

//Content of the web services modal when viewing data
var SourceURLs = [];

//Data arrays for JSON returned data
var preddata = [];
var monthlychart = [];

//The array for the pred data streams
var PredWLs = [];

//A table object for data listings.
var DataTable = new TAC.DataTable();

//A TimeSeriesCollection object for data
var TSC;
var data;
var alldata;

//The min and max for both charts
var chartymin = null;
var chartymax = null;

var BDate;
var EDate;
var startDayOfWeek;
var tabledatanum;
var datumoptions;
var apiunits;
var apitimezone;
var credittext =
  "NOAA/NOS/Center for Operational Oceanographic Products and Services";
var titlealign = "center";
var topmargin;
var legendalign = "left";
var currentDate = new Date(Date.now());

var error = false;
var zoomTypeString = "x";

//The default state of the data listing.  Change to large to default to full-size.
var datalistingsize = "small";

//The computed page width, to check if a resize event has affected the plot width
var pagewidth;

//Change to true to enable debugging statements.
var logging = false;

$(document).ready(function () {
  console.log("document.ready fired");

  if (subordinate != "true") {
    topmargin = 70;
  } else {
    topmargin = 100;
  }

  //For mobile devices
  if ($(window).width() < 450) {
    credittext = "NOAA/NOS/CO-OPS";
    titlealign = "left";
    if (subordinate != "true") {
      topmargin = 130;
    } else {
      topmargin = 200;
    }
    legendalign = "right";
    zoomTypeString = ""; //do not allow chart zoom on mobile
  }

  const tidePredictionsMdapiURL =
    TAC.getMDApiUrl() + "stations.json?type=tidepredictions";

  $.getJSON(tidePredictionsMdapiURL, function (data) {
    const stations = data.stations;
    var options = "";

    for (var i = 0; i < stations.length - 1; i++) {
      let station = stations[i];
      if (station.id == station_id) {
        options +=
          '<option value="' +
          station.id +
          '" selected>' +
          station.id +
          " " +
          station.name +
          "</option>";
      } else {
        options +=
          '<option value="' +
          station.id +
          '">' +
          station.id +
          " " +
          station.name +
          "</option>";
      }
    }

    $("#stationselect").html(options);
    $("#stationselect").chosen({
      no_results_text: "No stations matched",
      search_contains: true
    });
  }).fail(function () {
    console.log("MDAPI Call Failed:" + tidePredictionsMdapiURL);
  });

  var unit_string = "feet";
  if (units == "metric") {
    unit_string = "meters";
  }

  var wlabbrev = "ft.";
  if (units == "metric") {
    wlabbrev = "m.";
  }

  var today = new Date();

  Date.prototype.stdTimezoneOffset = function () {
    var jan = new Date(this.getFullYear(), 0, 1);
    var jul = new Date(this.getFullYear(), 6, 1);
    return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
  };

  Date.prototype.dst = function () {
    return this.getTimezoneOffset() < this.stdTimezoneOffset();
  };

  var dstOffset = 0;
  if (today.dst() == true && observesDST == 1) {
    dstOffset = 1;
  }

  if (timezone == "LST/LDT") {
    console.log(timezonecorr + " dstOffset: " + dstOffset);
    currentDate.setHours(
      currentDate.getHours() + parseInt(timezonecorr) + dstOffset
    );
  } else if (timezone == "LST") {
    currentDate.setHours(currentDate.getHours() + parseInt(timezonecorr));
  } else {
    currentDate.setHours(currentDate.getHours());
  }

  var dayDifference = daydiff(parseDate(begin_date), parseDate(end_date));
  var showDataPoints = false;

  if (
    dayDifference <= 10 &&
    ($(window).width() > 450 || dayDifference <= 2) &&
    (interval == "hilo" || interval == "hi" || interval == "lo")
  ) {
    showDataPoints = true;
  }

  // define the options for the main plot
  var hasPred = true;
  var showRightAxis = true;

  if (thresholdvalue == "") {
    threshold = "";
  }

  if (threshold == "") {
    highchartnegopacity = 0;
    highchartposopacity = 0;
  } else if (threshold == "greaterThan") {
    highchartnegopacity = 0;
    highchartposopacity = 1;
  } else if (threshold == "lessThan") {
    highchartnegopacity = 1;
    highchartposopacity = 0;
  }

  options = {
    chart: {
      type: "areaspline",
      renderTo: "container",
      zoomType: zoomTypeString,
      plotBackgroundColor: {
        linearGradient: [0, 0, 0, 410],
        stops: [
          [0, "rgb(126, 242, 255)"],
          [1, "rgb(206, 254, 255)"]
        ]
      },
      height: 437,
      plotBackgroundColor: "#FFFFF2",
      plotBackgroundColor: "#FFFFFF",
      plotBorderWidth: 1,
      marginTop: topmargin,
      marginRight: 35,
      animation: {
        duration: 100,
        easing: "swing"
      }
    },
    title: {
      style: {
        color: "#000000",
        fontSize: "12px",
        fontWeight: "bold",
        fontFamily: "Arial"
      },
      align: titlealign
    },
    credits: {
      enabled: true,
      text: credittext,
      href: "http://tidesandcurrents.noaa.gov",
      position: {
        align: "right",
        x: -35,
        y: -47
      },
      style: {
        color: "#333333"
      }
    },
    xAxis: {
      type: "datetime",
      gridLineWidth: 1,
      maxZoom: 4 * 60 * 60 * 1000, //1 hour
      plotLines: [
        {
          color: "#009933",
          width: 3,
          value: currentDate,
          label: {
            text: "Current Time (" + timezone + ")",
            style: {
              color: "#009933" //,
              //font: '11px Helvetica'
            }
          }
        }
      ],
      labels: {
        align: "left",
        x: 3,
        y: 15,
        formatter: function () {
          var date = new Date(this.value);
          hour = date.getUTCHours();
          ampm = "AM";

          if (clock == "12hour") {
            if (hour == 12) {
              ampm = "PM";
            }
            if (hour == 00) {
              hour = 12;
            }
            if (hour > 12) {
              hour = hour - 12;
              ampm = "PM";
            }
          }

          var datestring;
          if (clock == "12hour") {
            datestring =
              TAC.pad2(hour) +
              ":" +
              TAC.pad2(date.getUTCMinutes()) +
              " " +
              ampm +
              "<br/>" +
              (date.getUTCMonth() + 1) +
              "/" +
              date.getUTCDate();
          } else {
            datestring =
              TAC.pad2(date.getUTCHours()) +
              ":" +
              TAC.pad2(date.getUTCMinutes()) +
              "<br/>" +
              (date.getUTCMonth() + 1) +
              "/" +
              date.getUTCDate();
          }
          return datestring;
        }
      },
      maxPadding: 0,
      minPadding: 0,
      showLastLabel: true
    },
    yAxis: [
      {
        // left y axis
        title: {
          text: "Height in " + unit_string + " (" + datum + ")",
          margin: 40,
          style: {
            fontSize: "14px",
            fontWeight: "normal",
            fontFamily: "arial",
            color: "#000000"
          }
        },
        labels: {
          align: "center",
          overflow: "justify",
          formatter: function () {
            return Highcharts.numberFormat(this.value, 1);
          },
          x: -18
        },
        gridLineWidth: 1,
        gridLineDashStyle: "Solid",
        showFirstLabel: false,
        startOnTick: true,
        endOnTick: true
      },
      {
        // right y axis
        linkedTo: 0,
        gridLineWidth: 0,
        opposite: true,
        title: {
          text: null
        },
        labels: {
          align: "right",
          formatter: function () {
            return Highcharts.numberFormat(this.value, 1);
          },
          x: 18,
          enabled: showRightAxis
        },
        showFirstLabel: false
      }
    ],
    tooltip: {
      shared: true,
      crosshairs: true,
      formatter: function () {
        var date = new Date(this.x);
        var datestring;
        if (clock == "12hour") {
          datestring = Highcharts.dateFormat(
            "%A, %b %e %Y, %l:%M %p " + timezone,
            date
          );
        } else {
          datestring = Highcharts.dateFormat(
            "%A, %b %e %Y, %H:%M " + timezone,
            date
          );
        }

        var s = '<span style="font-size: 10px;">' + datestring + "</span>";
        if (this.points) {
          s +=
            '<br/><span style="color: #0080FF">' +
            this.points[0].series.name +
            ":</span><b> " +
            this.points[0].y.toFixed(2) +
            wlabbrev +
            "</b>";
        } else {
          s +=
            '<br/><span style="color: #00FF00">' +
            this.series.name +
            ":</span><b> " +
            this.y.toFixed(2) +
            wlabbrev +
            "</b>";
        }
        return s;
      }
    },
    plotOptions: {
      series: {
        //threshold: using rgba(red, green, blue, opacity)
        threshold: thresholdvalue,
        fillColor: "rgba(255,0,0," + highchartposopacity + ")",
        negativeFillColor: "rgba(255,0,0," + highchartnegopacity + ")",

        cursor: "pointer",
        gapSize: 1,
        connectNulls: false,
        dataLabels: {
          enabled: showDataPoints,
          padding: 0,
          //format: '{y} ' + wlabbrev
          formatter: function () {
            return Highcharts.numberFormat(this.y, 2);
          }
        },
        marker: {
          lineWidth: 1,
          enabled: showDataPoints,
          symbol: "triangle",
          states: {
            hover: {
              enabled: true,
              marker: {
                symbol: "square"
              }
            }
          }
        }
      },
      line: {
        lineWidth: 2
      },
      scatter: {
        marker: {
          enabled: true,
          symbol: "circle"
        },
        dataLabels: {
          enabled: true
        }
      }
    },
    series: [
      {
        name: "Predictions",
        id: "Predictions",
        lineWidth: 2,
        color: "#0080FF",
        marker: {
          symbol: "square",
          radius: 4
        },
        zIndex: 1,
        showInLegend: false
      }
    ],
    exporting: {
      enabled: true,
      type: "image/png"
      //url: '/wb/index.php'
    },
    navigation: {
      buttonOptions: {
        align: "right"
      }
    }
  };

  optionsmonthly = {
    title: {
      text: ""
    },
    chart: {
      type: "areaspline",
      renderTo: "tabledata0",
      height: 100,
      borderWidth: 0,
      plotBorderWidth: 0,
      marginBottom: 0,
      marginTop: 0,
      marginLeft: 0,
      marginRight: 0,
      spacingBottom: 0,
      spacingTop: 0,
      spacingLeft: 0,
      spacingRight: 0,
      showAxes: false,
      animation: {
        duration: 100,
        easing: "swing"
      }
    },
    credits: {
      enabled: false
    },
    xAxis: {
      type: "datetime",
      gridLineWidth: 0,
      labels: {
        enabled: false
      },
      plotLines: [
        {
          color: "#009933",
          width: 3,
          value: currentDate
        }
      ],
      maxPadding: 0,
      minPadding: 0
    },
    yAxis: {
      // left y axis
      title: {
        text: ""
      },
      labels: {
        enabled: false
      },
      gridLineWidth: 0,
      gridLineDashStyle: "Solid",
      startOnTick: false,
      endOnTick: false
    },
    tooltip: {
      shared: true,
      crosshairs: true,
      hideDelay: 0,
      formatter: function () {
        var date = new Date(this.x);
        var datestring;
        if (clock == "12hour") {
          datestring = Highcharts.dateFormat(
            "%A, %b %e %Y, %l:%M %p " + timezone,
            date
          );
        } else {
          datestring = Highcharts.dateFormat(
            "%A, %b %e %Y, %H:%M " + timezone,
            date
          );
        }

        var s = '<span style="font-size: 10px;">' + datestring + "</span>";
        if (this.points) {
          s +=
            '<br/><span style="color: #0080FF">' +
            this.points[0].series.name +
            ":</span><b> " +
            this.points[0].y +
            wlabbrev +
            "</b>";
        } else {
          s +=
            '<br/><span style="color: #00FF00">' +
            this.series.name +
            ":</span><b> " +
            this.y +
            wlabbrev +
            "</b>";
        }
        return s;
      }
    },
    plotOptions: {
      series: {
        //threshold: using rgba(red, green, blue, opacity)
        threshold: thresholdvalue,
        fillColor: "rgba(255,0,0," + highchartposopacity + ")",
        negativeFillColor: "rgba(255,0,0," + highchartnegopacity + ")",

        cursor: "pointer",
        gapSize: 1,
        connectNulls: false,
        dataLabels: {
          enabled: true,
          padding: 0,
          formatter: function () {
            return Highcharts.numberFormat(this.y, 2);
          }
        },
        marker: {
          lineWidth: 1,
          enabled: true,
          symbol: "triangle",
          states: {
            hover: {
              enabled: true,
              marker: {
                symbol: "square"
              }
            }
          }
        }
      },
      line: {
        lineWidth: 2
      },
      scatter: {
        marker: {
          enabled: true,
          symbol: "circle"
        },
        dataLabels: {
          enabled: true
        }
      }
    },
    series: [
      {
        name: "Predictions",
        id: "Predictions",
        lineWidth: 2,
        color: "#0080FF",
        marker: {
          symbol: "square",
          radius: 4
        },
        zIndex: 1,
        showInLegend: false
      }
    ],
    exporting: {
      enabled: false
    },
    navigation: {
      buttonOptions: {
        align: "right"
      }
    }
  };

  $("#wlcover").width($("#container").width() / 2);
  $("#wlcover").css(
    "left",
    $("#container").offset().left + $("#container").width() / 4
  );
  $("#wlcover").css(
    "top",
    $("#container").offset().top + $("#container").height() / 2
  );

  // Load data asynchronously using jQuery. On success, add the data
  // to the options and initiate the chart.

  if (fetchData() == false) {
    error = true;
  }

  //Fix the form controls.  This is because firefox tries to preserve control state even when the page is refreshed.
  var bdateobj = new TAC.DateString(begin_date + "0000");
  var edateobj = new TAC.DateString(end_date + "2359");
  BDate = new Date(bdateobj.getTimeStamp() + 1 * 24 * 60 * 60 * 1000);
  EDate = new Date(edateobj.getTimeStamp());

  updateDateControls(BDate, EDate);

  $("#interval").bind("click", function () {
    $("#forminterval").val($("#interval").val());
    $(".ic").removeClass("active");
    $(this).addClass("active");
    return false;
  });

  pagewidth = $(document).width();

  //Register the click handler for the expand/contract data listing button
  $("#expand_listing").click(function () {
    toggleDataListing();
  });

  //show disclaimers
  if (datum != "MLLW") {
    $("#datum_warning").show();
    $("#datum_warning").html(
      "<div class='alert' style='margin-top: 20px; margin-bottom: 20px;'>Warning: The above predictions referred to " +
        datum +
        " and not to the chart datum of MLLW; Therefore should not be used for navigation purposes.</div>"
    );
  } else {
    $("#datum_warning").hide();
  }
  if (
    action != "data" &&
    (interval == "hilo" || interval == "hi" || interval == "lo")
  ) {
    $("#hilo_warning").show();
    $("#hilo_warning").html(
      "<div class='alert' style='margin-top: 20px; margin-bottom: 20px;'>Note: The interval above is High/Low, the solid blue line depicts a curve fit between the high and low values and approximates the segments between.</div>"
    );
  } else {
    $("#hilo_warning").hide();
  }
});
//End document onready()

function parseDate(str) {
  var year = str.substring(0, 4);
  var month = str.substring(4, 6);
  var day = str.substring(6, 8);
  month = parseInt(month) - 1;
  return new Date(year, month, day);
}

function daydiff(first, second) {
  return Math.round((second - first) / (1000 * 60 * 60 * 24));
}

function fetchData() {
  //Setup the API's necessary unit and timezone parameters.
  //Zero out the web services modal content
  SourceURLs = [];

  var apiunits = units;
  if (apiunits == "standard") {
    apiunits = "english";
  }
  var apitimezone = timezone;
  if (timezone == "LST/LDT") {
    apitimezone = "lst_ldt";
  }

  //Get predictions
  var dayDifference = daydiff(parseDate(begin_date), parseDate(end_date));

  //fetch data for the day before the start date and day after the end date. This is so the curves continue past the first and last tides of the day.
  data_begin_date = parseDate(begin_date);
  data_begin_date.setDate(data_begin_date.getDate() - 1);
  var year = String(data_begin_date.getFullYear());
  var month = String(parseInt(data_begin_date.getMonth()) + 1);
  var day = String(data_begin_date.getDate());
  if (parseInt(month) < 10) {
    month = String(0) + month;
  }
  if (parseInt(day) < 10) {
    day = String(0) + day;
  }
  data_begin_date = year + month + day;

  data_end_date = parseDate(end_date);
  data_end_date.setDate(data_end_date.getDate() + 1);
  year = String(data_end_date.getFullYear());
  month = String(parseInt(data_end_date.getMonth()) + 1);
  day = String(data_end_date.getDate());
  if (parseInt(month) < 10) {
    month = String(0) + month;
  }
  if (parseInt(day) < 10) {
    day = String(0) + day;
  }
  data_end_date = year + month + day;

  //retrieve all hilo's even when user selects only high or only low
  var apiInterval = interval;
  if (apiInterval == "hi" || apiInterval == "lo") {
    apiInterval = "hilo";
  }

  if (dayDifference <= 31) {
    $.getJSON(
      "/api/datagetter",
      {
        product: "predictions",
        begin_date: data_begin_date,
        end_date: data_end_date,
        datum: datum,
        station: station_id,
        time_zone: apitimezone,
        units: apiunits,
        interval: apiInterval,
        format: "json",
        application: "NOS.COOPS.TAC.TidePred"
      },
      function (jsondata2) {
        if (jsondata2.predictions) {
          var predurl =
            "/api/datagetter?product=predictions&application=NOS.COOPS.TAC.WL&begin_date=" +
            begin_date +
            "&end_date=" +
            end_date +
            "&datum=" +
            datum +
            "&station=" +
            station_id +
            "&time_zone=" +
            apitimezone +
            "&units=" +
            apiunits +
            "&interval=" +
            apiInterval; //for the web services modal
          SourceURLs.push("Tide Predictions:" + predurl);
          preddata = jsondata2;
          //log(preddata);
          TSC = parseJSON();
          drawChart();
          return true;
        } else {
          console.log("Pred JSON error");
          message = jsondata2.error.message;
          showNoDataError(message);
          return false;
        }
      }
    );
  } else {
    message =
      " Range Limit Exceeded: The size limit for data retrieval for this product is 31 days";
    showNoDataError(message);
    return false;
  }
}

function showNoDataError(message) {
  console.log("shownodata called");
  if (message == "") {
    message = "There is no data for the interval and time period requested.";
  }
  $("#wlcover").hide();
  $("#data_container").hide();
  $("#data_listing_table_fixed_header").hide();
  $("#container").height(60);
  $("#container").html(
    "<div class='alert' style='margin-top: 20px; margin-bottom: 20px;'><strong>Error:</strong> " +
      message +
      "</div>"
  );
  //if (action == data) {
  //$("#container").show();
  //}
}

function drawChart() {
  //Populate the data table object for data viewing

  DataTable = TSC.getDataTable();
  alldata = DataTable.getData();

  var BeginDate;
  var EndDate;
  if (clock == "12hour") {
    BeginDate = new TAC.DateString(begin_date + "12" + "00");
    EndDate = new TAC.DateString(end_date + "11" + "59");
  } else {
    BeginDate = new TAC.DateString(begin_date + "00" + "00");
    EndDate = new TAC.DateString(end_date + "23" + "59");
  }

  if (clock == "12hour") {
    var begin_date_string = BeginDate.toDateString() + " AM " + timezone;
    var end_date_string = EndDate.toDateString() + " PM " + timezone;
  } else {
    var begin_date_string = BeginDate.toDateString() + " " + timezone;
    var end_date_string = EndDate.toDateString() + " " + timezone;
  }

  console.log("drawChart() called with " + begin_date_string + " " + end_date_string);

  var titlestring =
    "NOAA/NOS/CO-OPS<br/>" +
    "Tide Predictions at " +
    station_id +
    ", " +
    station_name +
    " " +
    station_state +
    "<br/>From " +
    begin_date_string +
    " to " +
    end_date_string +
    "<br>" +
    refStationInfo;
  if ($(window).width() < 450) {
    titlestring =
      "NOAA/NOS/CO-OPS<br/>" +
      "Tide Predictions <br> " +
      station_id +
      ", " +
      station_name +
      " " +
      station_state +
      "<br/>From " +
      begin_date_string +
      " <br>to " +
      end_date_string +
      "<br>" +
      refStationInfo;
  }

  //function for monthly plots
  function parseAndStoreDayData(preddatanum, daynum) {
    //we need these because javascript is dumb
    if (!daydata[daynum]) {
      daydata[daynum] = [];
    }
    if (!daydata[daynum + 1]) {
      daydata[daynum + 1] = [];
    }
    if (!daydata[daynum + 2]) {
      daydata[daynum + 2] = [];
    }
    //every other day get data for day of, day before, and day after but set min and max to day of (this is so the plot will continue after the day of data has ended)
    if (
      TSC.getSeriesByName("pred").data[i][0].getMonth() == parseInt(calMonth)
    ) {
      if (
        TSC.getSeriesByName("pred").data[preddatanum][0].getDay() ==
          dayNumber[daynum] ||
        TSC.getSeriesByName("pred").data[preddatanum][0].getDay() ==
          dayNumber[daynum + 1] ||
        TSC.getSeriesByName("pred").data[preddatanum][0].getDay() ==
          dayNumber[daynum + 2]
      ) {
        if (
          !daymin[daynum + 1] &&
          TSC.getSeriesByName("pred").data[preddatanum][0].getDay() ==
            dayNumber[daynum + 1]
        ) {
          var year = TSC.getSeriesByName("pred").data[preddatanum][0].getYear();
          var month = TSC.getSeriesByName("pred").data[
            preddatanum
          ][0].getMonth();
          var day = TSC.getSeriesByName("pred").data[preddatanum][0].getDay();
          month = month - 1;
          daymin[daynum + 1] = Date.UTC(year, month, day);
          day = parseInt(day) + 1;
          daymax[daynum + 1] = Date.UTC(year, month, day);
        }
        daydata[daynum + 1][counter[daynum + 1]] = TSC.getSeriesByName(
          "pred"
        ).getTimeSeries()[preddatanum];
        counter[daynum + 1] = counter[daynum + 1] + 1;
      }
    }
  }

  var eday = end_date.substring(6, 8);
  var edayminusone = parseInt(eday) - 1;

  //Set the time series data
  if (action == "dailychart") {
    options.title.text = titlestring;
    options.yAxis[0].min = chartymin;
    options.yAxis[0].max = chartymax;

    var year = begin_date.substring(0, 4);
    var month = begin_date.substring(4, 6);
    var day = begin_date.substring(6, 8);
    options.xAxis.min = Date.UTC(year, parseInt(month) - 1, day);

    year = end_date.substring(0, 4);
    month = end_date.substring(4, 6);
    day = end_date.substring(6, 8);
    options.xAxis.max = Date.UTC(year, parseInt(month) - 1, parseInt(day) + 1);

    if (options.series[0]) {
      options.series[0].data = TSC.getSeriesByName("pred").getTimeSeries();
    }
  } else if (action == "monthlychart") {
    optionsmonthly.yAxis.min = chartymin;
    optionsmonthly.yAxis.max = chartymax + chartymax * 0.3; //give a little room for the high labels
    console.log(optionsmonthly.yAxis.max);

    if (optionsmonthly.series[0]) {
      var year = begin_date.substring(0, 4);
      var calMonth = begin_date.substring(4, 6);
      numDaysInMonth = new Date(year, calMonth, 0).getDate();
      numDaysInPrevMonth = new Date(year, parseInt(calMonth) - 1, 0).getDate();

      var dayNumber = [
        "01",
        "02",
        "03",
        "04",
        "05",
        "06",
        "07",
        "08",
        "09",
        "10",
        "11",
        "12",
        "13",
        "14",
        "15",
        "16",
        "17",
        "18",
        "19",
        "20",
        "21",
        "22",
        "23",
        "24",
        "25",
        "26",
        "27",
        "28",
        "29",
        "30",
        "31"
      ];
      var daymin = [];
      var daymax = [];
      var daydata = [[]]; //2d array
      var counter = [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ];
      var dayCounter = 0;

      //this loop parses the data for each day and stores that data in a day specific array
      //each day array (dayData) stores it's day's data plus the data of the day before and the day after. This is so the plot continues to the edges of the chart and looks continuous.
      //special cases for the first and last day since the month changes on the day before the first day of the month and the day after the last day of the month
      for (var i = 0; i < TSC.getSeriesByName("pred").data.length; i++) {
        //For the first day (01) get data for the last day of the previous month, the first day, and the second day
        if (calMonth == 1) {
          //account for the first day in january
          prevCalMonth = 12;
        } else {
          prevCalMonth = parseInt(calMonth) - 1;
        }

        if (
          (TSC.getSeriesByName("pred").data[i][0].getMonth() == prevCalMonth &&
            TSC.getSeriesByName("pred").data[i][0].getDay() ==
              numDaysInPrevMonth) ||
          (TSC.getSeriesByName("pred").data[i][0].getMonth() ==
            parseInt(calMonth) &&
            TSC.getSeriesByName("pred").data[i][0].getDay() == "01") ||
          (TSC.getSeriesByName("pred").data[i][0].getMonth() ==
            parseInt(calMonth) &&
            TSC.getSeriesByName("pred").data[i][0].getDay() == "02")
        ) {
          if (
            !daymin[0] &&
            TSC.getSeriesByName("pred").data[i][0].getDay() == dayNumber[0]
          ) {
            var year = TSC.getSeriesByName("pred").data[i][0].getYear();
            var month = TSC.getSeriesByName("pred").data[i][0].getMonth();
            var day = TSC.getSeriesByName("pred").data[i][0].getDay();
            month = month - 1;
            daymin[0] = Date.UTC(year, month, day);
            day = parseInt(day) + 1;
            daymax[0] = Date.UTC(year, month, day);
          }
          daydata[0][counter[0]] = TSC.getSeriesByName("pred").getTimeSeries()[
            i
          ];
          counter[0] = counter[0] + 1;
        }

        //loop through all the days besides the first day and last day
        for (var j = 0; j < parseInt(eday) - 2; j++) {
          parseAndStoreDayData(i, j);
        }

        //For the last day get data for second to last day, the last day, and the first day of the next month
        if (calMonth == 12) {
          //account for the last day in december
          nextCalMonth = 1;
        } else {
          nextCalMonth = parseInt(calMonth) + 1;
        }

        if (!daydata[edayminusone]) {
          daydata[edayminusone] = [];
        }
        if (
          (TSC.getSeriesByName("pred").data[i][0].getMonth() ==
            parseInt(calMonth) &&
            TSC.getSeriesByName("pred").data[i][0].getDay() == edayminusone) ||
          (TSC.getSeriesByName("pred").data[i][0].getMonth() ==
            parseInt(calMonth) &&
            TSC.getSeriesByName("pred").data[i][0].getDay() == eday) ||
          (TSC.getSeriesByName("pred").data[i][0].getMonth() == nextCalMonth &&
            TSC.getSeriesByName("pred").data[i][0].getDay() == "01")
        ) {
          if (
            !daymin[edayminusone] &&
            TSC.getSeriesByName("pred").data[i][0].getDay() ==
              dayNumber[edayminusone]
          ) {
            var year = TSC.getSeriesByName("pred").data[i][0].getYear();
            var month = TSC.getSeriesByName("pred").data[i][0].getMonth();
            var day = TSC.getSeriesByName("pred").data[i][0].getDay();
            month = month - 1;
            daymin[edayminusone] = Date.UTC(year, month, day);
            day = parseInt(day) + 1;
            daymax[edayminusone] = Date.UTC(year, month, day);
          }
          daydata[edayminusone][counter[edayminusone]] = TSC.getSeriesByName(
            "pred"
          ).getTimeSeries()[i];
          counter[edayminusone] = counter[edayminusone] + 1;
        }
      }
    }
    console.log(daydata);
  }

  viewData();

  //Chart the data for the first time
  if (action == "dailychart") {
    $("#plotrow").show();
    $("#monthlyplot").hide();
    chart = new Highcharts.Chart(options, function (mainchartobj) {
      $("#wlcover").hide();
    });
    TAC.fixedTableHeader("data_listing_table");
  } else if (action == "monthlychart") {
    $("#plotrow").hide();
    $("#monthlyplot").show();

    //find the first weekday of the month
    byear = begin_date.substring(0, 4);
    bmonth = begin_date.substring(4, 6);
    bday = begin_date.substring(6, 8);
    startDayOfWeek = new Date(byear, parseInt(bmonth) - 1, bday).getDay();

    tabledatanum = 0;
    //create a chart for each day
    for (var i = 0; i < eday; i++) {
      optionsmonthly.series[0].data = daydata[i];
      tabledatanum = i + startDayOfWeek;
      optionsmonthly.chart.renderTo = "tabledata" + tabledatanum;
      optionsmonthly.xAxis.min = daymin[i];
      optionsmonthly.xAxis.max = daymax[i];
      monthlychart[i] = new Highcharts.Chart(optionsmonthly, function (
        mainchartobj
      ) {
        $("#wlcover").hide();
      });

      //calendar numbers
      monthlychart[i].renderer
        .text(i + 1, 0, 14)
        .css({
          fontSize: "16px"
        })
        .add();
    }

    if (tabledatanum < 28) {
      $("#secondToLastRow").hide();
    }
    if (tabledatanum < 35) {
      $("#lastRow").hide();
    }
    TAC.fixedTableHeader("data_listing_table");
  }
}

function console.log(message) {
  if (logging) {
    if (window.console && console.log) {
      console.log(message);
    }
  }
}

//Returns a TAC.TimeSeriesCollection object with the appropriate time series
function parseJSON() {
  console.log("parseJSON called");
  chartymin = null;
  chartymax = null;

  var PredWLs = new TAC.TimeSeries("pred");

  //Populate the predictions time series, if available.
  if (preddata.predictions) {
    for (var i = 0; i < preddata.predictions.length; i++) {
      var ts = preddata.predictions[i].t;
      var dateobj = new TAC.DateString(ts);

      var predvalue = preddata.predictions[i].v;

      var timestamp = dateobj.getTimeStamp();
      if (predvalue == "") {
        predvalue = null;
      } else {
        predvalue = parseFloat(predvalue);
      }

      PredWLs.add(dateobj, predvalue);
      if (predvalue < chartymin || chartymin == null) {
        chartymin = predvalue;
      }
      if (predvalue > chartymax || chartymax == null) {
        chartymax = predvalue;
      }
    }
  }

  var collection = new TAC.TimeSeriesCollection();
  collection.addSeries(PredWLs);
  return collection;
}

//Introduce a 500ms delay to prevent rapid-fire resize events.
$(window).resize(function () {
  if (this.resizeTO) clearTimeout(this.resizeTO);
  this.resizeTO = setTimeout(function () {
    $(this).trigger("resizeEnd");
  }, 500);
});

$(window).bind("resizeEnd", function () {
  if (chart) {
    if ($(document).width() != pagewidth) {
      pagewidth = $(document).width();
      chart.redraw();
    }
  }
  if (monthlychart) {
    height = monthlychart.height;
    width = $("#monthlyplot").width() * 0.14;
    for (var i = 0; i < monthlychart.length; i++) {
      monthlychart[i].setSize(width, height, (doAnimation = true));
    }
  }
});

function updateChart(buttonaction) {
  console.log("chartymin " + chartymin);
  console.log("chartymax " + chartymax);

  if (buttonaction == "data") {
    action = "data";
  } else if (buttonaction == "daily") {
    action = "dailychart";
  } else if (buttonaction == "monthly") {
    action = "monthlychart";
  }

  console.log("updateChart called");

  if (action != "monthlychart") {
    $("#backbutton").html('<i class="icon-step-backward"></i>Back 1 Day');
    $("#forwardbutton").html('<i class="icon-step-forward"></i>Forward 1 Day');
    if (subordinate != "true") {
      //need to disable/enable these selections for mobile
      $("#interval1").prop("disabled", false);
      $("#interval6").prop("disabled", false);
      $("#interval15").prop("disabled", false);
      $("#interval30").prop("disabled", false);
      $("#intervalh").prop("disabled", false);
      $("#interval1").show();
      $("#interval6").show();
      $("#interval15").show();
      $("#interval30").show();
      $("#intervalh").show();
    }
    //Grab all of the form variables
    begin_date = document.getElementById("plotform").elements["bdate"].value;
    end_date = document.getElementById("plotform").elements["edate"].value;
  } else {
    var byear = document
      .getElementById("plotform")
      .elements["bdate"].value.substring(0, 4);
    var bmonth = document
      .getElementById("plotform")
      .elements["bdate"].value.substring(4, 6);
    var lastDay = new Date(byear, bmonth, 0).getDate(); //lastday of the month
    begin_date = byear + bmonth + "01";
    end_date = byear + bmonth + lastDay;
  }

  datum = $("#datum").val();
  units = $("#units").val();
  timezone = $("#timezone").val();
  clock = $("#clock").val();
  interval = $("#interval").val();
  threshold = $("#threshold").val();
  thresholdvalue = $("#thresholdvalue").val();

  var stateObj = { foo: "bar" };
  var url =
    "noaatidepredictions.html?id=" +
    station_id +
    "&units=" +
    units +
    "&bdate=" +
    begin_date +
    "&edate=" +
    end_date +
    "&timezone=" +
    timezone +
    "&clock=" +
    clock +
    "&datum=" +
    datum +
    "&interval=" +
    interval +
    "&action=" +
    action;
  if (thresholdvalue != "") {
    url += "&thresholdvalue=" + thresholdvalue + "&threshold=" + threshold;
  }

  //comment this back in for cleaner page loads. (breaks a lot of stuff)
  //action != monthly chart && errors == false && interval has not changed && interval < 10 days && action is not from monthly to daily && change in the clock && change in the timezone
  //TODO print error to see whats happening
  //console.log(error+"!!!!!!!!!!");
  //if (history.pushState && action == "data" && error == false) {
  //do a clean page reload
  //history.pushState(stateObj, "Tide Predictions", url);
  //if (fetchData() == false){
  //error = true;
  //}
  //} else {
  //full page reload

  window.location = url;

  //}
}

function viewData() {
  console.log("viewData called");

  //Generate the html for a table with the water levels.
  var html =
    "<table class='table table-striped table-condensed' id='data_listing_table'><thead><tr>";

  var wlunits = "ft";
  if (units != "standard") {
    wlunits = "m";
  }

  html +=
    "<th>Date</th><th>Day of the Week</th><th>Time (" +
    timezone +
    ")</th><th>Predicted (" +
    wlunits +
    ")</th><th>High/Low</th>";
  html += "</tr></thead><tbody>";

  var weekday = new Array(7);
  weekday[0] = "Sun";
  weekday[1] = "Mon";
  weekday[2] = "Tue";
  weekday[3] = "Wed";
  weekday[4] = "Thu";
  weekday[5] = "Fri";
  weekday[6] = "Sat";

  var byear = begin_date.substring(0, 4);
  var bmonth = begin_date.substring(4, 6);
  var bday = begin_date.substring(6, 8);
  var startDate = new Date(byear, parseInt(bmonth) - 1, bday);

  var eyear = end_date.substring(0, 4);
  var emonth = end_date.substring(4, 6);
  var eday = end_date.substring(6, 8);
  var endDate = new Date(eyear, parseInt(emonth) - 1, parseInt(eday) + 1);

  //log(alldata);
  //log(preddata);
  var j = 0;

  for (var i = 0; i < alldata.length; i++) {
    var ds = new TAC.DateString(alldata[i].getTimeStamp());
    var dataDate = new Date(ds.toDateString());

    //do not include data that is not between the begin date and end date
    if (dataDate >= startDate && dataDate <= endDate) {
      j++;

      var pred = parseFloat(preddata.predictions[i].v);
      pred = pred.toFixed(2);

      var hilo = preddata.predictions[i].type;
      if (pred == null) {
        pred = "-";
      }
      if (hilo == null) {
        hilo = "-";
      }
      if (interval == "hi" && hilo == "L") {
        continue;
      }
      if (interval == "lo" && hilo == "H") {
        continue;
      }

      hour = ds.getHour();
      minute = ds.getMinute();
      ampm = "AM";

      if (clock == "12hour") {
        if (hour == 12) {
          ampm = "PM";
        }
        if (hour == 00) {
          hour = 12;
        }
        if (hour > 12) {
          hour = hour - 12;
          ampm = "PM";
        }
        minute = minute + " " + ampm;
      }

      //add askterisks to pred threshold values
      if (thresholdvalue == "") {
        html +=
          "<tr><td>" +
          ds.getYear() +
          "/" +
          ds.getMonth() +
          "/" +
          ds.getDay() +
          "</td><td>" +
          weekday[dataDate.getDay()] +
          "</td><td>" +
          hour +
          ":" +
          minute +
          "</td><td>" +
          pred +
          "</td><td>" +
          hilo +
          "</td></tr>";
      } else if (threshold == "greaterThan") {
        if (Number(pred) >= thresholdvalue) {
          html +=
            "<tr><td>" +
            ds.getYear() +
            "/" +
            ds.getMonth() +
            "/" +
            ds.getDay() +
            "</td><td>" +
            weekday[dataDate.getDay()] +
            "</td><td>" +
            hour +
            ":" +
            minute +
            "</td><td style='color: red;'>*" +
            pred +
            "</td><td>" +
            hilo +
            "</td></tr>";
        } else {
          html +=
            "<tr><td>" +
            ds.getYear() +
            "/" +
            ds.getMonth() +
            "/" +
            ds.getDay() +
            "</td><td>" +
            weekday[dataDate.getDay()] +
            "</td><td>" +
            hour +
            ":" +
            minute +
            "</td><td>" +
            pred +
            "</td><td>" +
            hilo +
            "</td></tr>";
        }
      } else if (threshold == "lessThan") {
        if (Number(pred) <= thresholdvalue) {
          html +=
            "<tr><td>" +
            ds.getYear() +
            "/" +
            ds.getMonth() +
            "/" +
            ds.getDay() +
            "</td><td>" +
            weekday[dataDate.getDay()] +
            "</td><td>" +
            hour +
            ":" +
            minute +
            "</td><td style='color: red;'>*" +
            pred +
            "</td><td>" +
            hilo +
            "</td></tr>";
        } else {
          html +=
            "<tr><td>" +
            ds.getYear() +
            "/" +
            ds.getMonth() +
            "/" +
            ds.getDay() +
            "</td><td>" +
            weekday[dataDate.getDay()] +
            "</td><td>" +
            hour +
            ":" +
            minute +
            "</td><td>" +
            pred +
            "</td><td>" +
            hilo +
            "</td></tr>";
        }
      }
    }
  }

  html += "</tbody></table>";

  $("#data_listing").html(html);

  //hide the expand listing if the data fits in the default height OR if we're in mobile (for ease of use)
  if (j < 10 || $(window).width() < 450) {
    $("#data_listing").css("height", "auto");
    $("#expand_listing").hide();
  } else {
    $("#data_listing").css("height", "300px");
    $("#expand_listing").show();
    TAC.fixedTableHeader("data_listing_table"); //refresh table header so the scroll bar is not cut off
  }

  //Reveal the table element.
  $("#data_container").show();

  if (action == "data") {
    $("#plotrow").hide();
    $("#monthlyplot").hide();
  } else if (action == "dailychart") {
    $("#plotrow").show();
    $("#monthlyplot").hide();
  } else if (action == "monthlychart") {
    $("#plotrow").hide();
    $("#monthlyplot").show();
  }
  //Fix the table header in place when scrolling
  TAC.fixedTableHeader("data_listing_table");
}

function toggleDataListing() {
  if (datalistingsize == "small") {
    console.log("expandDataListing called");
    $("#data_listing").css("height", "auto");
    $("#expand_listing").attr("title", "Collapse the data listing");
    $("#expand_listing").html('<i class="icon-resize-small"></i>');
    datalistingsize = "large";
  } else {
    console.log("collapseDataListing called");
    if ($("#data_listing").height() < 300) {
      $("#data_listing").css("height", "auto");
    } else {
      $("#data_listing").css("height", "300px");
    }
    $("#expand_listing").attr("title", "Expand the data listing");
    $("#expand_listing").html('<i class="icon-resize-full"></i>');
    datalistingsize = "small";
  }
  TAC.fixedTableHeader("data_listing_table"); //refresh the table header to account for the scroll bar
}

function updateDateControls(newbegin, newend) {
  console.log("updateDateControls called with " + newbegin + " " + newend);
  document.getElementById("bdate_Month_ID").children[
    newbegin.getMonth()
  ].selected = true;
  document.getElementById("bdate_Day_ID").children[
    newbegin.getDate() - 1
  ].selected = true;
  document.getElementById("edate_Month_ID").children[
    newend.getMonth()
  ].selected = true;
  document.getElementById("edate_Day_ID").children[
    newend.getDate() - 1
  ].selected = true;
  var beginyear = newbegin.getYear();
  var endyear = newend.getYear();
  if (beginyear < 200) {
    beginyear += 1900;
  }
  if (endyear < 200) {
    endyear += 1900;
  }
  document.getElementById("bdate_Year_ID").value = beginyear;
  document.getElementById("edate_Year_ID").value = endyear;

  beginjs.checkYear(document.getElementById("bdate_Year_ID"));
  beginjs.changeDay(document.getElementById("bdate_Day_ID"));
  beginjs.changeMonth(document.getElementById("bdate_Month_ID"));
  endjs.checkYear(document.getElementById("edate_Year_ID"));
  endjs.changeDay(document.getElementById("edate_Day_ID"));
  endjs.changeMonth(document.getElementById("edate_Month_ID"));

  var bdatelist = document.getElementById("bdate_Day_ID");
  if (bdatelist.children.length < newbegin.getDate()) {
    bdatelist.children[bdatelist.children.length - 1].selected = true;
  }
  for (var i = 0; i < bdatelist.children.length; i++) {
    if (bdatelist.children[i].value == newbegin.getDate()) {
      bdatelist.children[i].selected = true;
    }
  }

  var edatelist = document.getElementById("edate_Day_ID");
  if (edatelist.children.length < newend.getDate()) {
    edatelist.children[edatelist.children.length - 1].selected = true;
  }
  for (var i = 0; i < edatelist.children.length; i++) {
    if (edatelist.children[i].value == newend.getDate()) {
      edatelist.children[i].selected = true;
    }
  }
}

//"earlier" or "later", shifts the chart and controls by one day.
function scrollPlot(dir) {
  //Reset the data ready indicators

  console.log("scroll called with " + dir);
  var byear = begin_date.substring(0, 4);
  var bmonth = begin_date.substring(4, 6);
  bmonth--;
  var bday = begin_date.substring(6, 8);
  var preBeginDate = new Date(byear, bmonth, bday);

  var eyear = end_date.substring(0, 4);
  var emonth = end_date.substring(4, 6);
  emonth--;
  var eday = end_date.substring(6, 8);
  var preEndDate = new Date(eyear, emonth, eday);

  //Shift interval is set to 1 day if we're not plotting monthly means, otherwise, 1 month.
  var shiftamount;
  if (dir == "earlier") {
    shiftamount = -1;
  } else if (dir == "later") {
    shiftamount = 1;
  }

  if (action != "monthlychart") {
    preBeginDate.setDate(preBeginDate.getDate() + shiftamount);
    preEndDate.setDate(preEndDate.getDate() + shiftamount);
  } else {
    preBeginDate.setMonth(preBeginDate.getMonth() + shiftamount);
    preEndDate.setDate(1);
    preEndDate.setMonth(preEndDate.getMonth() + shiftamount + 1); //set to 2 months ahead to utilized the setDate(0) function
    preEndDate.setDate(0); //this sets the date to the last day of the PREVIOUS month
  }

  begin_date =
    preBeginDate.getFullYear() +
    "" +
    TAC.pad2(preBeginDate.getMonth() + 1) +
    TAC.pad2(preBeginDate.getDate());
  document.getElementById("plotform").elements["bdate"].value = begin_date;

  end_date =
    preEndDate.getFullYear() +
    "" +
    TAC.pad2(preEndDate.getMonth() + 1) +
    TAC.pad2(preEndDate.getDate());
  document.getElementById("plotform").elements["edate"].value = end_date;

  updateDateControls(preBeginDate, preEndDate);
  shiftChart(dir);
}

function shiftChart(dir) {
  console.log("shiftChart called with " + dir);
  if (action == "dailychart") {
    chart.showLoading();
  } else {
    $("#container").show();
    $("#monthlyplot").hide();
  }

  var stateObj = { foo: "bar" };

  var url =
    "noaatidepredictions.html?id=" +
    station_id +
    "&units=" +
    units +
    "&bdate=" +
    begin_date +
    "&edate=" +
    end_date +
    "&timezone=" +
    timezone +
    "&clock=" +
    clock +
    "&datum=" +
    datum +
    "&interval=" +
    interval +
    "&action=" +
    action;
  if (thresholdvalue != "") {
    url += "&thresholdvalue=" + thresholdvalue + "&threshold=" + threshold;
  }

  if (history.pushState && action != "monthlychart") {
    history.pushState(stateObj, "Tide Predictions", url);
    if (fetchData() == false) {
      error = true;
    }
  } else {
    window.location = url;
  }
}

function changestation(stnid) {
  var url = "/noaatidepredictions.html?id=" + stnid;
  window.location = url;
}

//TODO use this to generate next tide box instead of in noaatidepredictions.cgi (so we don't have to reload the page every time)(right now this breaks the fixed table header in mobile mode)
function generateNextTideBox() {
  var nextTideTimezone = timezone;
  if (timezone == "LST/LDT") {
    nextTideTimezone = "LST_LDT";
  }

  var nextTideUnits;
  var displayUnits;
  if (units == "standard") {
    nextTideUnits = "english";
    displayUnits = "ft.";
  } else {
    nextTideUnits = units;
    displayUnits = "m.";
  }

  $.ajax({
    url:
      "/cgi-bin/stationtideinfo.cgi?Stationid=" +
      station_id +
      "&datum=" +
      datum +
      "&timezone=" +
      nextTideTimezone +
      "&units=" +
      nextTideUnits +
      "&clock=" +
      clock +
      "&decimalPlaces=2",
    type: "GET",
    dataType: "html",
    timeout: 3000,
    error: function () {
      var html = "Tide predictions are not available for this station.";
      $("#next_tide").html(html);
    },
    success: function (tideResults) {
      var html = "<b>Today's Tides (" + timezone + ")</b>";

      var imageHTML =
        "<div style='margin: auto; text-align: center; position: relative;'><img src='/images/tidelow2.png' alt='graphical depiction of low tide' style='border: 1px solid black; padding: 5px; background-color: white; margin-top: 10px; margin-bottom: 10px;'>";

      var tableHTML =
        "<table class='table table-condensed' style='margin-bottom: 0px;'>";

      var tides = tideResults.split(/\n/);
      var nextTide = tides[tides.length - 1];
      var nextTideTime = nextTide.split("|")[0];
      var nextTideType = nextTide.split("|")[1];

      var nextTideHTML =
        "<div style='position: absolute; margin: auto; text-align: center; width: 100%; top: 35px; height: 40px; text-align: center;'><span style='color: black; font-weight: bold; font-size: 18px;'>" +
        nextTideTime +
        "</span><br><span style='color: black; font-weight: bold; font-size: 12px;'>" +
        nextTideType +
        "</span></div>";

      for (var i = 0; i < tides.length - 1; i++) {
        tideTime = tides[i].split("|")[0];
        tideValue = tides[i].split("|")[1];
        tideType = tides[i].split("|")[2];

        if (tideTime == nextTideTime) {
          tableHTML +=
            "<tr><td><b>" +
            tideTime +
            "</b></td><td><b>" +
            tideType +
            "</b></td><td><b>" +
            tideValue +
            " " +
            displayUnits +
            "</b></td></tr>";
        } else {
          tableHTML +=
            "<tr><td>" +
            tideTime +
            "</td><td>" +
            tideType +
            "</td><td>" +
            tideValue +
            " " +
            displayUnits +
            "</td></tr>";
        }
      }

      tableHTML += "</table>";

      html += imageHTML + nextTideHTML + tableHTML;

      $("#next_tide").html(html);
    }
  });
}

function createPrinterViewPage() {
  var actionDisplay;
  var chartHTML;
  var monthlyChartHTML = [];
  if (action == "dailychart") {
    actionDisplay = "Daily";
    chartHTML = chart.getSVG({
      chart: { width: 1000 }
    });
  } else if (action == "monthlychart") {
    actionDisplay = "Monthly";
    for (var i = 0; i < monthlychart.length; i++) {
      monthlyChartHTML[i] = monthlychart[i].getSVG({
        chart: { width: 100, height: 100 }
      });
    }
  } else if (action == "data") {
    actionDisplay = "Data Only";
    chartHTML = "<br><br><br><br><br>";
  }

  if (subordinate == "true") {
    displaySubordinate = "Subordinate";
  } else {
    displaySubordinate = "Harmonic";
  }

  var byear = parseInt(begin_date.substring(0, 4));
  var bmonth = parseInt(begin_date.substring(4, 6));
  var bday = parseInt(begin_date.substring(6, 8));
  var eyear = parseInt(end_date.substring(0, 4));
  var emonth = parseInt(end_date.substring(4, 6));
  var eday = parseInt(end_date.substring(6, 8));
  var beginDateDisplay;
  var endDateDisplay;
  if (clock == "12hour") {
    beginDateDisplay = byear + "/" + bmonth + "/" + bday + " 12:00 AM";
    endDateDisplay = eyear + "/" + emonth + "/" + eday + " 11:59 PM";
  } else {
    beginDateDisplay = byear + "/" + bmonth + "/" + bday + " 00:00";
    endDateDisplay = eyear + "/" + emonth + "/" + eday + " 23:59";
  }

  var intervalDisplay;
  if (interval == "1") {
  } else if (interval == "6") {
    intervalDisplay = "Six Minute";
  } else if (interval == "15") {
    intervalDisplay = "15 Minute";
  } else if (interval == "30") {
    intervalDisplay = "30 Minute";
  } else if (interval == "h") {
    intervalDisplay = "Hourly";
  } else if (interval == "hilo") {
    intervalDisplay = "High/Low";
  } else if (interval == "hi") {
    intervalDisplay = "High Only";
  } else if (interval == "lo") {
    intervalDisplay = "Low Only";
  }

  var unitsDisplay;
  if (units == "standard") {
    unitsDisplay = "Feet";
  } else if (units == "metric") {
    unitsDisplay = "Meters";
  }

  var thresholdDirectionDisplay;
  if (threshold == "greaterThan") {
    thresholdDirectionDisplay = ">=";
  } else if (threshold == "lessThan") {
    thresholdDirectionDisplay = "<=";
  }

  var newwindow = window.open();
  newdocument = newwindow.document;
  newdocument.write(
    "<title>" +
      station_name +
      ", " +
      station_state +
      " " +
      station_id +
      " Tidal Data Print View</title>"
  );
  newdocument.write("<body>");
  newdocument.write("<div align='center' style='width:100%;'>");
  newdocument.write("<div style='float:left; width: 50%;'>");
  newdocument.write(
    "<img src='/images/NOAA_logo.png' alt='NOAA image' height='79px' width='79px'/>"
  );
  newdocument.write("</div>");

  newdocument.write("<div style='float:right; width: 50%;'>");
  newdocument.write("<a href='noaatidepredictionshelp.html'>Help</a>");
  newdocument.write(
    "&nbsp;&nbsp;<input type='button' value='  Print  ' onclick='window.document.close(); window.focus(); window.print();' alt='Print'>"
  );
  newdocument.write("</div>");
  newdocument.write("</div>");
  if (action == "monthlychart") {
    var months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ];
    var monthNum = BDate.getMonth();
    newdocument.write(
      "<div align='center' style='width:100%;'><br><br><br><br><br><b>NOAA/NOS/CO-OPS<br>Tide Predictions at " +
        station_id +
        ", " +
        station_name +
        " " +
        station_state +
        "<br>" +
        months[monthNum] +
        " " +
        BDate.getFullYear() +
        " Monthly Calendar View</b></div>"
    );
    newdocument.write("<table border='1' style='width:100%;'>");
    newdocument.write("<tr>");
    newdocument.write("<th>Sunday</th>");
    newdocument.write("<th>Monday</th>");
    newdocument.write("<th>Tuesday</th>");
    newdocument.write("<th>Wednesday</th>");
    newdocument.write("<th>Thursday</th>");
    newdocument.write("<th>Friday</th>");
    newdocument.write("<th>Saturday</th>");
    newdocument.write("</tr>");

    if (tabledatanum <= 27) {
      numOfBlocksInTable = 27;
    } else if (tabledatanum > 27) {
      numOfBlocksInTable = 34;
    } else if (tabledatanum > 34) {
      numOfBlocksInTable = 41;
    }

    //build the calendar
    for (var i = 0; i <= numOfBlocksInTable; i++) {
      if (i % 7 == 0) {
        if (i != 0) {
          newdocument.write("</tr>");
        }
        newdocument.write("<tr>");
      }

      if (monthlyChartHTML[i] == undefined) {
        monthlyChartHTML[i] = "";
      }
      if (i >= startDayOfWeek) {
        if (monthlyChartHTML[i - startDayOfWeek] == "") {
          newdocument.write(
            "<td id='tabledata" +
              i +
              "' style='width: 14.2%; height: 30px;'><span style='vertical-align:top'></span></td>"
          );
        } else {
          newdocument.write(
            "<td id='tabledata" +
              i +
              "' style='position: relative; width: 14.2%; height: 104px;'><span style='position: absolute; top: 0;'>" +
              (i - startDayOfWeek + 1) +
              "</span><span style='position: absolute; top: 0; left: 0; z-index: -1;'>" +
              monthlyChartHTML[i - startDayOfWeek] +
              "</span></td>"
          );
        }
      } else {
        newdocument.write(
          "<td id='tabledata" +
            i +
            "' style='width: 14.2%; height: 30px;'></td>"
        );
      }
    }

    newdocument.write("</table>");
  } else {
    newdocument.write(
      "<div align='center' style='width:100%;'>" + chartHTML + "</div>"
    );
  }
  if ($(datum_warning).is(":visible") == true) {
    newdocument.write(
      "<div align='center' style='width:100%'>Warning: The predictions on this page refer to " +
        datum +
        " and not to the chart datum of MLLW; Therefore should not be used for navigation purposes.</div>"
    );
  }
  if ($(hilo_warning).is(":visible") == true && action != "data") {
    newdocument.write(
      "<div align='center' style='width:100%'>Note: The interval is High/Low, the solid blue line depicts a curve fit between the high and low values and approximates the segments between.</div>"
    );
  }
  newdocument.write(
    "<div align='center' style='width:100%'>Disclaimer: These data are based upon the latest information available as of the date of your request, and may differ from the published tide tables.</div><br><br>"
  );
  if (action == "monthlychart") {
    newdocument.write("<br><br><br><br><br><br><br><br>");
  }
  newdocument.write(
    "<div align='center' style='width:100%'><b>" +
      intervalDisplay +
      " Tide Prediction Data Listing</b><br>"
  );
  newdocument.write("<div align='center' style='width:100%;'>");
  newdocument.write("<div style='float:left; width: 50%;'>");
  newdocument.write(
    "Station Name: " + station_name + ", " + station_state + "<br>"
  );
  newdocument.write("Action: " + actionDisplay + "<br>");
  newdocument.write("Product: Tide Predictions<br>");
  newdocument.write("Start Date & Time: " + beginDateDisplay + "<br>");
  newdocument.write("End Date & Time: " + endDateDisplay + "<br>");
  if (thresholdvalue != "") {
    newdocument.write(
      "Threshold " +
        thresholdDirectionDisplay +
        " " +
        thresholdvalue +
        " (threshold values are appended with *)<br><br>"
    );
  } else {
    newdocument.write("<br>");
  }

  newdocument.write("</div>");
  newdocument.write("<div style='float:right; width: 50%;'>");
  newdocument.write("Source: NOAA/NOS/CO-OPS<br>");
  newdocument.write("Prediction Type: " + displaySubordinate + "<br>");
  newdocument.write("Datum: " + datum + "<br>");
  newdocument.write("Height Units: " + unitsDisplay + "<br>");
  newdocument.write("Time Zone: " + timezone + "<br><br>");
  newdocument.write("</div>");
  newdocument.write("</div>");

  //build the data listing table
  newdocument.write("<div align='center' style='width:100%;'>");
  newdocument.write(
    "<table width='100%' align='center' cellspacing='1' cellpadding='4' border='1' bordercolor='CCE6FF' bordercolorlight='CCE6FF' bordercolordark='CCE6FF' bgcolor='ffffff'>"
  );
  newdocument.write("<tr bgcolor='C2D8FF'>");
  newdocument.write("<th>Date</th>");
  newdocument.write("<th>Day</th>");
  newdocument.write("<th>Time</th>");
  newdocument.write("<th>Hgt</th>");
  newdocument.write("<th>Time</th>");
  newdocument.write("<th>Hgt</th>");
  if (interval != "hi" && interval != "lo") {
    newdocument.write("<th>Time</th>");
    newdocument.write("<th>Hgt</th>");
    newdocument.write("<th>Time</th>");
    newdocument.write("<th>Hgt</th>");
  }
  newdocument.write("</tr>");

  var weekday = new Array(7);
  weekday[0] = "Sun";
  weekday[1] = "Mon";
  weekday[2] = "Tue";
  weekday[3] = "Wed";
  weekday[4] = "Thu";
  weekday[5] = "Fri";
  weekday[6] = "Sat";

  var newDataDay = -99;
  var count = 0;

  var beginDate = new Date(byear, bmonth - 1, bday);
  var endDate = new Date(eyear, emonth - 1, eday, 23, 59, 59);

  for (var i = 0; i < alldata.length; i++) {
    var ds = new TAC.DateString(alldata[i].getTimeStamp());
    var dataYear = parseInt(ds.getDate().substring(0, 4));
    var dataMonth = parseInt(ds.getDate().substring(4, 6));
    var dataDay = parseInt(ds.getDate().substring(6, 8));

    //do not include data that is not between the begin date and end date
    var dataDate = new Date(ds.toDateString());
    if (
      dataDate.getTime() >= beginDate.getTime() &&
      dataDate.getTime() <= endDate.getTime()
    ) {
      //if (dataYear >= byear && dataYear <= eyear && dataMonth >= bmonth && dataMonth <= emonth && dataDay >= bday && dataDay <= eday){
      if (newDataDay != dataDay || count == 4) {
        if (newDataDay != -99) {
          newdocument.write("</tr>");
        }
        newDataDay = dataDay;
        count = 0;
        newdocument.write("<tr align='center'>");
        newdocument.write(
          "<td>" +
            ds.getYear() +
            "/" +
            ds.getMonth() +
            "/" +
            ds.getDay() +
            "</td>"
        );
        newdocument.write("<td>" + weekday[dataDate.getDay()] + "</td>");
      }

      var pred = parseFloat(preddata.predictions[i].v);
      var hilo = preddata.predictions[i].type;

      if (pred == null) {
        pred = "";
      }
      if (hilo == null) {
        hilo = "";
      }

      pred = pred.toFixed(2);

      if (interval == "hi" && hilo == "L") {
        continue;
      }
      if (interval == "lo" && hilo == "H") {
        continue;
      }

      hour = ds.getHour();
      minute = ds.getMinute();
      ampm = "AM";

      if (clock == "12hour") {
        if (hour == 12) {
          ampm = "PM";
        }
        if (hour == 00) {
          hour = 12;
        }
        if (hour > 12) {
          hour = hour - 12;
          ampm = "PM";
        }
        minute = minute + " " + ampm;
      }

      newdocument.write("<td>" + hour + ":" + minute + "</td>");
      if (threshold == "") {
        newdocument.write("<td>" + pred + " " + hilo + "</td>");
      } else if (threshold == "greaterThan") {
        if (pred >= thresholdvalue) {
          newdocument.write(
            "<td style='color: red;'>*" + pred + " " + hilo + "</td>"
          );
        } else {
          newdocument.write("<td>" + pred + " " + hilo + "</td>");
        }
      } else if (threshold == "lessThan") {
        if (pred <= thresholdvalue) {
          newdocument.write(
            "<td style='color: red;'>*" + pred + " " + hilo + "</td>"
          );
        } else {
          newdocument.write("<td>" + pred + " " + hilo + "</td>");
        }
      }
      count++;
    }
  }
  newdocument.write("</table>");
  newdocument.write("</div>");
  newdocument.write("</body>");
}

function outputPredFile(format) {
  var elementId;
  if (format == "xml") {
    elementId = "data_listing_xml";
  } else if (format == "txt") {
    elementId = "data_listing_txt";
  }

  $("#" + elementId).attr(
    "href",
    "/cgi-bin/predictiondownload.cgi?&stnid=" +
      station_id +
      "&threshold=" +
      thresholdvalue +
      "&thresholdDirection=" +
      threshold +
      "&bdate=" +
      begin_date +
      "&edate=" +
      end_date +
      "&units=" +
      units +
      "&timezone=" +
      timezone +
      "&datum=" +
      datum +
      "&interval=" +
      interval +
      "&clock=" +
      clock +
      "&type=" +
      format +
      "&annual=false"
  );
}

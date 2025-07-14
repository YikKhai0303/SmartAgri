// Page - Dashboard Page
// frontend\src\pages\DashboardPage.js

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useNavigate } from "react-router-dom";
import * as am5 from "@amcharts/amcharts5";
import * as am5xy from "@amcharts/amcharts5/xy";
import am5themes_Animated from "@amcharts/amcharts5/themes/Animated";

function formatForDateTimeLocal(date) {
  const pad = n => String(n).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate())
  ].join("-") + "T" + [ pad(date.getHours()), pad(date.getMinutes()) ].join(":");
}

const DATA_TYPES = [
  { key: 'soilMoisture', label: 'Soil Moisture', unit: '%' },
  { key: 'soilTemperature', label: 'Soil Temperature', unit: '°C' },
  { key: 'relativeHumidity', label: 'Relative Humidity', unit: '%' },
  { key: 'airTemperature', label: 'Air Temperature', unit: '°C' },
  { key: 'lightIntensity', label: 'Light Intensity', unit: 'lux' },
  { key: 'windSpeed', label: 'Wind Speed', unit: 'm/s' }
];

const MAX_DATA_POINTS = 3000;
const INTERVAL_MS_MAP = {
  minute: 60 * 1000,
  hour: 60 * 60 * 1000,
  day: 24 * 60 * 60 * 1000,
};

const DashboardPage = ({ hasSetup }) => {
  const [summaryLevel, setSummaryLevel] = useState("farmSummaryMode");
  const [farms, setFarms] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState("allFarms");
  const [selectedZone, setSelectedZone] = useState("allZones");
  const [selectedDataType, setSelectedDataType] = useState(DATA_TYPES[0].key);
  const [startTime, setStartTime] = useState(formatForDateTimeLocal(new Date(Date.now() - 24*60*60*1000)));
  const [endTime, setEndTime] = useState(formatForDateTimeLocal(new Date()));
  const [interval, setInterval] = useState("auto");

  const navigate = useNavigate();
  const chartRef = useRef(null);
  const [shouldInitialLoad, setShouldInitialLoad] = useState(false);
  const [hasFilterChanges, setHasFilterChanges] = useState(false);
  const isMountedRef = useRef(true);
  const [autoTriggered, setAutoTriggered] = useState(false);

  const disposeChart = () => {
    if (chartRef.current) {
      chartRef.current.dispose();
      chartRef.current = null;
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      disposeChart();
    };
  }, []);

  useEffect(() => {
    if (!hasSetup) return;
    let isCancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem("token");

        const farmRes = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/farms`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (isCancelled || !isMountedRef.current) return;
        if (farmRes.status === 401) {
          localStorage.removeItem("token");
          return navigate("/login");
        }
        const farmPayload = await farmRes.json();
        const farmList = Array.isArray(farmPayload) ? farmPayload : farmPayload.farms || [];

        const zoneRes = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/zones`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (isCancelled || !isMountedRef.current) return;
        if (zoneRes.status === 401) {
          localStorage.removeItem("token");
          return navigate("/login");
        }
        const zonePayload = await zoneRes.json();
        const zoneList = Array.isArray(zonePayload) ? zonePayload : zonePayload.zones || [];

        if (isCancelled || !isMountedRef.current) return;
        setFarms(farmList);
        setZones(zoneList);
        setShouldInitialLoad(true);
      } catch (error) {
        if (!isCancelled && isMountedRef.current) {
          console.error("Error fetching farms/zones:", error);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [hasSetup, navigate]);

  const effectiveInterval = useMemo(() => {
    if (interval !== "auto") return interval;

    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const span = end - start;
    const oneHour = 1000 * 60 * 60;
    const oneDay = oneHour * 24;

    if (span <= oneHour) return "minute";
    if (span <= oneDay * 7) return "hour";
    return "day";
  }, [interval, startTime, endTime]);

  // Main function to fetch the data visualization chart
  const fetchChart = async () => {
    if (!isMountedRef.current) return;

    try {
      const token = localStorage.getItem("token");
      const isFarmMode = summaryLevel === "farmSummaryMode";
      const endpoint = isFarmMode
        ? `${process.env.REACT_APP_API_BASE_URL}/api/readings/farm-aggregated`
        : `${process.env.REACT_APP_API_BASE_URL}/api/readings/zone-aggregated`;
      const headers = { Authorization: `Bearer ${token}` };

      let targets;
      if (isFarmMode) {
        targets = selectedFarm === "allFarms"
          ? farms.map(f => ({ id: f._id, name: f.farmName }))
          : [{ id: selectedFarm, name: farms.find(f => f._id === selectedFarm)?.farmName }];
      } else {
        targets = selectedZone === "allZones"
          ? zones.filter(z => z.farmObjectId._id === selectedFarm).map(z => ({ id: z._id, name: z.zoneName }))
          : [{ id: selectedZone, name: zones.find(z => z._id === selectedZone)?.zoneName }];
      }

      if (chartRef.current) {
        chartRef.current.dispose();
        chartRef.current = null;
      }

      // Chart creation
      const root = am5.Root.new("chartdiv");
      chartRef.current = root;
      root.setThemes([ am5themes_Animated.new(root) ]);
      root._logo.dispose();

      const chart = root.container.children.push(
        am5xy.XYChart.new(root, {
          panX: true,
          panY: false,
          wheelX: "panX",
          wheelY: "zoomX",
          layout: root.verticalLayout
        })
      );
      chart.get("colors").set("step", 2);

      // Scrollbar (zooming)
      const scrollbarX = am5xy.XYChartScrollbar.new(root, {
        orientation: "horizontal",
        height: 10,
        paddingTop: 0,
        paddingBottom :0,
        marginTop: 0,
        marginBottom: 20
      });
      chart.set("scrollbarX", scrollbarX);
      chart.topAxesContainer.children.push(scrollbarX);

      // Cursor (mainly used for xAxis time value display when hover)
      const cursor = chart.set("cursor", am5xy.XYCursor.new(root, { behavior: "none" }));

      // xAis (time)
      const dateAxis = chart.xAxes.push(
        am5xy.DateAxis.new(root, {
          maxDeviation: 0.1,
          baseInterval: { timeUnit: effectiveInterval, count: 1 },
          renderer: am5xy.AxisRendererX.new(root, { minGridDistance: 50 })
        })
      );

      dateAxis.get("renderer").labels.template.setAll({
        rotation: 0,
        centerY: am5.p50,
        centerX: am5.p50,
        paddingTop: 10,
        fontSize: "0.9rem"
      });

      cursor.set("xAxis", dateAxis);
      dateAxis.set("tooltip", am5.Tooltip.new(root, {}));

      // xAis (time) label
      dateAxis.children.push(
        am5.Label.new(root, {
          text: `Time (per ${effectiveInterval})`,
          x: am5.p50,
          centerX: am5.p50,
          paddingTop: 0,
          paddingBottom :0,
          marginTop: 10,
          marginBottom :0,
          fontWeight: "500",
          fontSize : "0.9rem"
        })
      );

      // Legend (closeable series label)
      chart.bottomAxesContainer.set("layout", root.verticalLayout);
      const legend = am5.Legend.new(root, {
        centerX: am5.p50,
        x: am5.p50,
        paddingTop: 0,
        paddingBottom :0,
        marginTop: 10,
        marginBottom :0,
        paddingLeft: 50,
      });
      chart.bottomAxesContainer.children.push(legend);
      legend.labels.template.setAll({
        fontSize: "0.9rem"
      });

      // yAis (value)
      const valueAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
          renderer: am5xy.AxisRendererY.new(root, {})
        })
      );
      valueAxis.get("renderer").labels.template.setAll({
        fontSize: "0.9rem"
      });

      // yAis (value) label
      const { label, unit } = DATA_TYPES.find(d => d.key === selectedDataType);
      valueAxis.children.unshift(
        am5.Label.new(root, {
          rotation: -90,
          y: am5.p50,
          centerX: am5.p50,
          text: `${label} (${unit})`,
          fontWeight: "500",
          fontSize: "0.9rem"
        })
      );

      // Smoothing Slider
      const allSeries = [];

      const sliderContainer = chart.bottomAxesContainer.children.push(
        am5.Container.new(root, {
          layout: root.horizontalLayout,
          x: am5.p50,
          centerX: am5.p50,
          y: am5.percent(100),
          centerY: am5.p100,
          width: am5.percent(25),
          paddingTop: 0,
          paddingBottom :0,
          marginTop: 5,
          marginBottom :0,
        })
      );

      sliderContainer.children.push(
        am5.Label.new(root, {
          text: "Smoothing:",
          fontSize: "0.9rem",
          centerY: am5.p50
        })
      );

      const smoothingSlider = sliderContainer.children.push(
        am5.Slider.new(root, {
          orientation: "horizontal",
          start: 0.5,
          min: 0,
          max: 1,
          centerY: am5.p50,
          marginLeft: 10,
          marginRight: 10
        })
      );

      // Fetch data
      const results = await Promise.all(targets.map(async ({ id, name }) => {
        const url = new URL(endpoint);
        if (isFarmMode) url.searchParams.set("farmObjectId", id);
        else url.searchParams.set("zoneObjectId", id);
        url.searchParams.set("dataType", selectedDataType);
        url.searchParams.set("interval", effectiveInterval);
        url.searchParams.set("startTime", new Date(startTime).toISOString());
        url.searchParams.set("endTime", new Date(endTime).toISOString());

        const res = await fetch(url.toString(), { headers });
        if (res.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
          throw new Error("UNAUTHORIZED");
        }
        return { name, data: await res.json() };
      }));

      for (const { name, data } of results) {
        if (!Array.isArray(data) || data.length === 0) continue;

        const series = chart.series.push(
          am5xy.SmoothedXLineSeries.new(root, {
            name,
            xAxis: dateAxis,
            yAxis: valueAxis,
            valueXField: "timestamp",
            valueYField: "average",
            tension: 0.5,
            sequencedInterpolation: true,
            strokeWidth: 2,
            tooltip: am5.Tooltip.new(root, {
              labelText: "{name}: {valueY.formatNumber('#.00')}"
            })
          })
        );

        series.bullets.push(() =>
          am5.Bullet.new(root, {
            sprite: am5.Circle.new(root, {
              radius: 3,
              fill: series.get("stroke"),
              stroke: series.get("stroke"),
              strokeWidth: 1
            })
          })
        );

        series.data.setAll(
          data.map(d => ({
            timestamp: new Date(d.timestamp).getTime() + 8 * 3600_000,
            average: d.average
          }))
        );

        legend.data.push(series);

        allSeries.push(series);
      }

      smoothingSlider.on("start", () => {
        const t = smoothingSlider.get("start");
        allSeries.forEach(s => s.set("tension", t));
      });

      legend.onPrivate("itemContainers", () => {
        legend.get("itemContainers").forEach(itemContainer => {
          itemContainer.onPrivate("item", () => {
            const series = itemContainer.get("item");
            itemContainer.on("click", () => {
              series.isVisible() ? series.hide() : series.show();
            });
          });
        });
      });

    } catch (err) {
      console.error("Failed to fetch or render chart:", err);
    }
  };

  const applyFilters = () => {
    disposeChart();
    if (!isMountedRef.current) return;

    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    const spanMs = end - start;

    if (interval !== "auto") {
      const msPerPoint = INTERVAL_MS_MAP[interval] || 60 * 1000;
      const expectedPoints = Math.ceil(spanMs / msPerPoint);
      if (expectedPoints > MAX_DATA_POINTS) {
        alert(`Too many data points (${expectedPoints}). Auto-adjusting to auto interval.`);
        setInterval("auto");
        setAutoTriggered(true);
        return;
      }
    }

    fetchChart();
    setHasFilterChanges(false);
  };

  useEffect(() => {
    if (autoTriggered && interval === "auto") {
      fetchChart();
      setAutoTriggered(false);
    }
  }, [autoTriggered, interval]);

  const clearFilters = () => {
    disposeChart();

    if (isMountedRef.current) {
      setSummaryLevel("farmSummaryMode");
      setSelectedFarm("allFarms");
      setSelectedZone("allZones");
      setSelectedDataType(DATA_TYPES[0].key);
      setStartTime(formatForDateTimeLocal(new Date(Date.now() - 24*60*60*1000)));
      setEndTime(formatForDateTimeLocal(new Date()));
      setInterval("auto");

      setHasFilterChanges(false);
      setShouldInitialLoad(true);
    }
  };

  useEffect(() => {
    if (!hasSetup || !shouldInitialLoad || !isMountedRef.current) return;

    disposeChart();
    fetchChart();
    setShouldInitialLoad(false);
  }, [hasSetup, shouldInitialLoad]);

  useEffect(() => {
    if (!isMountedRef.current) return;

    if (summaryLevel === "farmSummaryMode") {
      setSelectedFarm("allFarms");
    } else {
      if (farms.length) {
        setSelectedFarm(farms[0]._id);
      }
      setSelectedZone("allZones");
    }
    setHasFilterChanges(true);
  }, [summaryLevel, farms]);



  return (
    <div className="page-content-container-inner-dashboard">
      <div className="page-title">Dashboard</div>

      {!hasSetup ? (
        <div className="noSetup">No farm setup found. Please go to Farm Page to begin setup.</div>
      ) : (
        <div className="page-content-dashboard">

          <div className="filter-parent-chart">
            <div className="filter-group">
              <div className="filter-container">
                <label className="filter-label">Summary Level</label>
                <select
                  className="filter-dropdown" value={summaryLevel}
                  onChange={e => { setSummaryLevel(e.target.value); setHasFilterChanges(true); }}
                >
                  <option value="farmSummaryMode">Farm Level Summary</option>
                  <option value="zoneSummaryMode">Zone Level Summary</option>
                </select>
              </div>
              <div className="filter-container">
                <label className="filter-label">Farm Name</label>
                <select
                  className="filter-dropdown" value={selectedFarm}
                  onChange={e => { const f = e.target.value; setSelectedFarm(f); setSelectedZone("allZones"); setHasFilterChanges(true); }}
                >
                  {summaryLevel === "farmSummaryMode" && (<option value="allFarms">All Farms</option>)}
                  {farms.map(f => (<option key={f._id} value={f._id}>{f.farmName}</option>))}
                </select>
              </div>
              <div className="filter-container">
                <label className="filter-label">Zone Name</label>
                <select
                  className="filter-dropdown" value={selectedZone} disabled={summaryLevel !== "zoneSummaryMode"}
                  onChange={e => { setSelectedZone(e.target.value); setHasFilterChanges(true); }}
                >
                  <option value="allZones">All Zones</option>
                  {zones.filter(z => z.farmObjectId._id === selectedFarm).map(z => (<option key={z._id} value={z._id}>{z.zoneName}</option>))}
                </select>
              </div>
              <div className="filter-container">
                <label className="filter-label">Data Type</label>
                <select
                  className="filter-dropdown" value={selectedDataType}
                  onChange={e => { setSelectedDataType(e.target.value); setHasFilterChanges(true); }}
                >
                  {DATA_TYPES.map(dt => (
                    <option key={dt.key} value={dt.key}>{dt.label}</option>
                  ))}
                </select>
              </div>

              <div className="filter-container">
                <label className="filter-label">Time Range</label>
                <input className="filter-date-select" type="datetime-local" value={startTime} onChange={e => { setStartTime(e.target.value); setHasFilterChanges(true); }}/>
                <div>&nbsp;to&nbsp;</div>
                <input className="filter-date-select" type="datetime-local" value={endTime} onChange={e => { setEndTime(e.target.value); setHasFilterChanges(true); }}/>
              </div>
              <div className="filter-container">
                <label className="filter-label">Data Interval</label>
                <select
                  className="filter-dropdown" value={interval}
                  onChange={e => { setInterval(e.target.value); setHasFilterChanges(true); }}
                >
                  <option value="auto">Auto (Best Fit)</option>
                  <option value="minute">Per Minute</option>
                  <option value="hour">Per Hour</option>
                  <option value="day">Per Day</option>
                </select>
              </div>
            </div>

            <div className="filter-button-container">
              <button className="main-button-clear" onClick={clearFilters}>Clear Filters</button>
              <button className="main-button" onClick={applyFilters} disabled={!hasFilterChanges}>Apply Filters</button>
            </div>
          </div>

          <div className="chart-container">
            <div id="chartdiv" />
          </div>
        </div>
      )}

    </div>
  );
};

export default DashboardPage;

import { useEffect, useRef } from 'react';
import { createChart, LineSeries } from 'lightweight-charts';

export default function Chart({ history, targetPrice, hourStart }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const lineRef = useRef(null);
  const dataLenRef = useRef(0);
  const setupDoneRef = useRef(false);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: '#0a0a0a' },
        textColor: '#9ca3af',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
        borderColor: '#374151',
        fixLeftEdge: true,
        shiftVisibleRangeOnNewBar: false,
      },
      rightPriceScale: {
        borderColor: '#374151',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      crosshair: {
        horzLine: { color: '#6b7280', style: 2 },
        vertLine: { color: '#6b7280', style: 2 },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    const series = chart.addSeries(LineSeries, {
      color: '#3b82f6',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    chart.applyOptions({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });

    const handleResize = () => {
      if (containerRef.current) {
        chart.applyOptions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      lineRef.current = null;
      dataLenRef.current = 0;
      setupDoneRef.current = false;
    };
  }, []);

  // Handle data updates
  useEffect(() => {
    if (!seriesRef.current || !history.length || !hourStart) return;

    const sortedData = [...history].sort((a, b) => a.time - b.time);

    if (!setupDoneRef.current) {
      setupDoneRef.current = true;
      dataLenRef.current = sortedData.length;
      seriesRef.current.setData(sortedData);

      if (targetPrice) {
        lineRef.current = seriesRef.current.createPriceLine({
          price: targetPrice,
          color: '#f59e0b',
          lineWidth: 2,
          lineStyle: 2,
          axisLabelVisible: true,
          title: 'Target',
        });
      }

      // Set initial visible range to show the full hour with empty space to the right
      const hourStartSec = Math.floor(hourStart / 1000);
      const hourEndSec = hourStartSec + 3600;
      chartRef.current.timeScale().setVisibleRange({ from: hourStartSec, to: hourEndSec });
    } else {
      // Live update: just push new data
      // shiftVisibleRangeOnNewBar: false prevents auto-scroll
      if (sortedData.length > dataLenRef.current) {
        for (let i = dataLenRef.current; i < sortedData.length; i++) {
          seriesRef.current.update(sortedData[i]);
        }
        dataLenRef.current = sortedData.length;
      } else if (sortedData.length === dataLenRef.current && sortedData.length > 0) {
        seriesRef.current.update(sortedData[sortedData.length - 1]);
      }
    }
  }, [history, targetPrice, hourStart]);

  // Reset when target changes (new market)
  useEffect(() => {
    setupDoneRef.current = false;
    dataLenRef.current = 0;
    if (lineRef.current && seriesRef.current) {
      seriesRef.current.removePriceLine(lineRef.current);
      lineRef.current = null;
    }
  }, [targetPrice]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: 400 }}
    />
  );
}

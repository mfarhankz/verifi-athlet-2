"use client";

import { useState } from "react";
import { Button, Card, Modal, message } from "antd";
import { LinkOutlined, DownloadOutlined } from "@ant-design/icons";

interface MapChartProps {
  /**
   * URL to a MapChart image (if you've already created one)
   * Can be a local image path or external URL
   */
  mapImageUrl?: string;
  
  /**
   * MapChart.net URL for creating/editing maps
   * Example: "https://mapchart.net/world.html"
   */
  mapChartUrl?: string;
  
  /**
   * Title for the map
   */
  title?: string;
  
  /**
   * Description or caption for the map
   */
  description?: string;
  
  /**
   * Height of the map container
   */
  height?: string | number;
  
  /**
   * Width of the map container
   */
  width?: string | number;
  
  /**
   * Show the "Create Map" button
   */
  showCreateButton?: boolean;
  
  /**
   * Show the "Open in MapChart" button
   */
  showOpenButton?: boolean;
  
  /**
   * Custom styling for the container
   */
  className?: string;
}

/**
 * MapChart Component
 * 
 * Integrates MapChart.net functionality into your app.
 * Since MapChart.net doesn't have a public API, this component:
 * 1. Displays MapChart maps (as images) with proper attribution
 * 2. Provides links to create/edit maps on MapChart.net
 * 3. Can be extended to use react-simple-maps for programmatic maps
 * 
 * License: Maps created with MapChart.net are licensed under CC BY-SA 4.0
 * Attribution is required - this component includes it automatically.
 */
export default function MapChart({
  mapImageUrl,
  mapChartUrl = "https://mapchart.net/world.html",
  title,
  description,
  height = "500px",
  width = "100%",
  showCreateButton = true,
  showOpenButton = true,
  className = "",
}: MapChartProps) {
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedMapType, setSelectedMapType] = useState<string | null>(null);

  const mapTypes = [
    { name: "World Map", url: "https://mapchart.net/world.html" },
    { name: "USA States", url: "https://mapchart.net/usa.html" },
    { name: "Europe", url: "https://mapchart.net/europe.html" },
    { name: "Asia", url: "https://mapchart.net/asia.html" },
    { name: "North America", url: "https://mapchart.net/north-america.html" },
    { name: "South America", url: "https://mapchart.net/south-america.html" },
    { name: "Africa", url: "https://mapchart.net/africa.html" },
    { name: "Oceania", url: "https://mapchart.net/oceania.html" },
  ];

  const handleOpenMapChart = (url?: string) => {
    const targetUrl = url || mapChartUrl;
    window.open(targetUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownloadMap = () => {
    if (mapImageUrl) {
      const link = document.createElement("a");
      link.href = mapImageUrl;
      link.download = `mapchart-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success("Map download started");
    } else {
      message.info("No map image available to download");
    }
  };

  return (
    <div className={className} style={{ width }}>
      <Card
        title={title || "Map Chart"}
        extra={
          <div style={{ display: "flex", gap: "8px" }}>
            {mapImageUrl && (
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownloadMap}
                size="small"
              >
                Download
              </Button>
            )}
            {showOpenButton && (
              <Button
                icon={<LinkOutlined />}
                onClick={() => handleOpenMapChart()}
                size="small"
              >
                Open in MapChart
              </Button>
            )}
          </div>
        }
        style={{ height: typeof height === "number" ? `${height}px` : height }}
      >
        {mapImageUrl ? (
          <div style={{ textAlign: "center" }}>
            <img
              src={mapImageUrl}
              alt={title || "Map Chart"}
              style={{
                maxWidth: "100%",
                height: "auto",
                border: "1px solid #d9d9d9",
                borderRadius: "4px",
                cursor: "pointer",
              }}
              onClick={() => setPreviewVisible(true)}
              onError={(e) => {
                // Only show error if it's not a placeholder path
                if (!mapImageUrl.includes("path-to-your-map") && !mapImageUrl.includes("placeholder")) {
                  message.error("Failed to load map image. Please check the image URL.");
                }
                console.error("Map image error:", e);
              }}
            />
            {description && (
              <p style={{ marginTop: "12px", color: "#666", fontSize: "14px" }}>
                {description}
              </p>
            )}
            {/* Required attribution for MapChart.net */}
            <p
              style={{
                marginTop: "8px",
                fontSize: "12px",
                color: "#999",
                fontStyle: "italic",
              }}
            >
              Created with{" "}
              <a
                href="https://www.mapchart.net"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#1890ff" }}
              >
                mapchart.net
              </a>
            </p>
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              minHeight: "300px",
              gap: "16px",
            }}
          >
            <p style={{ color: "#666", textAlign: "center" }}>
              {description ||
                "No map image provided. Create a map on MapChart.net and add the image URL, or click below to create one."}
            </p>
            {showCreateButton && (
              <>
                <Button
                  type="primary"
                  icon={<LinkOutlined />}
                  onClick={() => setSelectedMapType("select")}
                  size="large"
                >
                  Create New Map
                </Button>
                <p style={{ fontSize: "12px", color: "#999", marginTop: "8px" }}>
                  Maps created with{" "}
                  <a
                    href="https://www.mapchart.net"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "#1890ff" }}
                  >
                    mapchart.net
                  </a>
                </p>
              </>
            )}
          </div>
        )}

        {/* Map Type Selection Modal */}
        <Modal
          title="Select Map Type"
          open={selectedMapType === "select"}
          onCancel={() => setSelectedMapType(null)}
          footer={null}
          width={600}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, 1fr)",
              gap: "12px",
            }}
          >
            {mapTypes.map((mapType) => (
              <Button
                key={mapType.name}
                onClick={() => {
                  handleOpenMapChart(mapType.url);
                  setSelectedMapType(null);
                }}
                style={{ height: "50px" }}
                block
              >
                {mapType.name}
              </Button>
            ))}
          </div>
          <p
            style={{
              marginTop: "16px",
              fontSize: "12px",
              color: "#999",
              textAlign: "center",
            }}
          >
            This will open MapChart.net in a new tab where you can create and
            customize your map.
          </p>
        </Modal>

        {/* Image Preview Modal */}
        <Modal
          title={title || "Map Preview"}
          open={previewVisible}
          onCancel={() => setPreviewVisible(false)}
          footer={[
            <Button key="download" icon={<DownloadOutlined />} onClick={handleDownloadMap}>
              Download
            </Button>,
            <Button key="close" onClick={() => setPreviewVisible(false)}>
              Close
            </Button>,
          ]}
          width={800}
        >
          {mapImageUrl && (
            <img
              src={mapImageUrl}
              alt={title || "Map Chart"}
              style={{ width: "100%", height: "auto" }}
            />
          )}
        </Modal>
      </Card>
    </div>
  );
}


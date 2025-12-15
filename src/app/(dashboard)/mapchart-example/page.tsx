"use client";

import { useState } from "react";
import MapChart from "@/components/MapChart";
import InteractiveUSMap from "@/components/InteractiveUSMap";
import { Card, Space, Input, Button, Divider, Typography } from "antd";

const { Title, Text } = Typography;

/**
 * Example page demonstrating how to use the MapChart component
 * 
 * To use MapChart in your app:
 * 1. Create a map on mapchart.net
 * 2. Download the map as an image
 * 3. Upload it to your public folder or use an external URL
 * 4. Use the MapChart component with the image URL
 */
export default function MapChartExamplePage() {
  const [customMapUrl, setCustomMapUrl] = useState("");
  const [displayUrl, setDisplayUrl] = useState("");

  const handleLoadMap = () => {
    if (customMapUrl.trim()) {
      setDisplayUrl(customMapUrl.trim());
    }
  };

  const [selectedStatesData, setSelectedStatesData] = useState<any[]>([]);
  const [selectedCountiesData, setSelectedCountiesData] = useState<any[]>([]);

  const handleStateSelect = (states: any[], allCounties: any[]) => {
    setSelectedStatesData(states);
    console.log("Selected States:", states);
    console.log("All Counties from selected states:", allCounties);
  };

  const handleCountySelect = (counties: any[]) => {
    setSelectedCountiesData(counties);
    console.log("Selected Counties:", counties);
  };

  return (
    <div style={{ padding: "0", maxWidth: "100%", margin: "0 auto", height: "100vh", display: "flex", flexDirection: "column" }}>
      
      {/* Interactive US Map */}
      <Card style={{ marginBottom: "24px", flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
      
        <InteractiveUSMap
          onStateSelect={handleStateSelect}
          onCountySelect={handleCountySelect}
          height="calc(90vh - 20px)"
          title="US States and Counties Map"
        />
        
        {/* Display selected data */}
        {(selectedStatesData.length > 0 || selectedCountiesData.length > 0) && (
          <Card 
            style={{ marginTop: "16px", backgroundColor: "#f0f2f5" }}
            title="Selected Data (from callbacks)"
          >
            {(() => {
              // Group selected counties by state
              const countiesByState = new Map<string, typeof selectedCountiesData>();
              selectedCountiesData.forEach((county) => {
                if (county && county.state) {
                  const stateName = county.state.trim();
                  if (!countiesByState.has(stateName)) {
                    countiesByState.set(stateName, []);
                  }
                  countiesByState.get(stateName)!.push(county);
                }
              });
              
              return (
                <div>
                  {selectedStatesData.map((state) => {
                    const stateName = state.name.trim();
                    const countiesForState = countiesByState.get(stateName) || [];
                    
                    return (
                      <div key={state.id} style={{ marginBottom: "20px" }}>
                        <Text strong style={{ display: "block", marginBottom: "8px", fontSize: "16px" }}>
                          {state.name}
                        </Text>
                        {countiesForState.length > 0 ? (
                          <div style={{ marginLeft: "16px" }}>
                            {countiesForState.map((county, index) => (
                              <div key={index} style={{ marginBottom: "4px" }}>
                                <Text>{county.name}</Text>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <Text type="secondary" style={{ marginLeft: "16px", fontSize: "12px" }}>
                            No counties selected
                          </Text>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #d9d9d9" }}>
              <Text type="secondary" style={{ fontSize: "12px" }}>
                This data is received from the onStateSelect and onCountySelect callbacks. 
                You can use this data to filter your database, fetch records, etc.
              </Text>
            </div>
          </Card>
        )}
      </Card>
    </div>
  );
}


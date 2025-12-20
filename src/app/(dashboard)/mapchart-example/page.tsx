"use client";

import { useState } from "react";
import MapChart from "@/components/MapChart";
import InteractiveUSMap from "@/components/InteractiveUSMap";
import {
  Card,
  Space,
  Input,
  Button,
  Divider,
  Typography,
  Tabs,
  Collapse,
  Checkbox,
} from "antd";

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
    <div
      style={{
        padding: "0",
        maxWidth: "100%",
        margin: "0 auto",
        height: "100vh",
        display: "flex",
        flexDirection: "row",
      }}
    >
      {/* Interactive US Map */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <InteractiveUSMap
          onStateSelect={handleStateSelect}
          onCountySelect={handleCountySelect}
          height="calc(90vh - 20px)"
          title="Assign Coaches"
        />

        {/* Display selected data */}
        {(selectedStatesData.length > 0 || selectedCountiesData.length > 0) && (
          <div
            style={{
              textAlign: "left",
              display: "block",
              backgroundColor: "#fff",
              padding: "16px",
              marginTop: "16px",
            }}
          >
            {(() => {
              // Group selected counties by state
              const countiesByState = new Map<
                string,
                typeof selectedCountiesData
              >();
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
                    const countiesForState =
                      countiesByState.get(stateName) || [];

                    return (
                      <div key={state.id} className="state-county-list-item">
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "10px",
                          }}
                        >
                          <h4 className="!text-[40px] font-bold !mb-0 leading-[40px]">
                            {state.name}
                          </h4>
                          <Checkbox>
                            <h6 className="!text-[16px] italic leading-[16px] !mb-0 !mt-1">
                              Select Entire State
                            </h6>
                          </Checkbox>
                        </div>
                        {countiesForState.length > 0 ? (
                          <div className="flex gap-1">
                            {countiesForState.map((county, index) => (
                              <h6 key={index} className="county-list-item">
                                {county.name}
                              </h6>
                            ))}
                          </div>
                        ) : (
                          <Text type="secondary">No counties selected</Text>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}
      </div>
      <div className="w-[340px] ml-3">
        <div
          style={{
            marginBottom: "24px",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <Tabs
            defaultActiveKey="1"
            items={[
              {
                key: "1",
                label: "US States & County",
                children: (
                  <Collapse
                    items={[
                      {
                        key: "1",
                        label: "State Information",
                        children: (
                          <div>
                            <Text>
                              State selection and county information will be
                              displayed here.
                            </Text>
                          </div>
                        ),
                      },
                      {
                        key: "2",
                        label: "County Details",
                        children: (
                          <div>
                            <Text>
                              Detailed county information will be shown here.
                            </Text>
                          </div>
                        ),
                      },
                    ]}
                  />
                ),
              },
              {
                key: "2",
                label: "Coaches",
                children: (
                  <Collapse
                    items={[
                      {
                        key: "1",
                        label: "Coach List",
                        children: (
                          <div>
                            <Text>List of coaches will be displayed here.</Text>
                          </div>
                        ),
                      },
                      {
                        key: "2",
                        label: "Coach Details",
                        children: (
                          <div>
                            <Text>
                              Detailed coach information will be shown here.
                            </Text>
                          </div>
                        ),
                      },
                    ]}
                  />
                ),
              },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

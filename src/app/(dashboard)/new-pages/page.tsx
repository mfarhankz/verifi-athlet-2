"use client";

import { Flex, Modal, Skeleton } from "antd";
import React, { useState } from "react";
import ImageWithAverage from "../_components/ImageWithAverage";

export default function NewPages() {
  const [isPlayerModalVisible, setIsPlayerModalVisible] = useState(true);
  const handleClosePlayerModal = () => {
    setIsPlayerModalVisible(false);
  };
  return (
    <div>
      <Modal
        title={null}
        open={isPlayerModalVisible}
        onCancel={handleClosePlayerModal}
        footer={null}
        width="95vw"
        style={{ top: 20 }}
        className="new-modal-ui"
        destroyOnHidden={true}
        closable={true}
        maskClosable={true}
      >
        <button className="close" onClick={() => {}}></button>

        <Flex>
          <div className="main-container-ui">
            <div className="grid grid-cols-[215px_minmax(0,1fr)] gap-2">
              <div className="flex flex-col gap-2">
                <div className="card">
                  <div className="player-img">
                    {false ? (
                      <Skeleton.Image
                        active
                        style={{ width: 200, height: 200 }}
                      />
                    ) : (
                      <ImageWithAverage
                        src={"/plyer-b.png"}
                        alt="Survey Image"
                        height={200}
                        width={200}
                        average={0}
                      />
                    )}
                    <ul>
                      <li>
                        <i className="icon-tape-measure"></i> 6.2” / 173lb
                      </li>
                      <li>
                        <i className="icon-calendar-04"></i> 2025
                      </li>
                      <li>
                        <i className="icon-receipt-item"></i> 9/17/1995 (29)
                      </li>
                      <li>
                        <i className="icon-receipt-item"></i> 3.5
                      </li>
                      <li>
                        <i className="icon-receipt-item"></i> Front Striker
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="card">
                  <h4 className="mt-2">
                    <i className="icon-receipt-item"></i> Player Links
                  </h4>
                  <ul className="link-list">
                    <li>
                      <a href={`https://www.google.com`}>HS Highlight Tape</a>
                    </li>
                  </ul>

                  <h5>
                    <i className="icon-receipt-item"></i> Transcript
                  </h5>
                  <ul className="link-list">
                    <li>
                      <a href={`https://www.google.com`}>
                        Download Transcript 1{" "}
                      </a>
                    </li>
                    <li>
                      <a href={`https://www.google.com`}>
                        Download Transcript 2{" "}
                      </a>
                    </li>
                    <li>
                      <a href={`https://www.google.com`}>
                        Download Transcript 3{" "}
                      </a>
                    </li>
                  </ul>

                  <h5>
                    <i className="icon-receipt-item"></i> SAT / ACT
                  </h5>
                  <ul className="link-list !mb-0">
                    <li>
                      <a href={`https://www.google.com`}>
                        Download SAT / ACT 1
                      </a>
                    </li>
                    <li>
                      <a href={`https://www.google.com`}>
                        Download SAT / ACT 2
                      </a>
                    </li>
                  </ul>
                </div>

                <div className="xfeed">
                  <div className="">
                    <img src="/x-logo.svg" alt="X Feed" height={50} />
                  </div>
                  <span className="gray">Follow on X</span>
                  <h3>Bryce Shaun</h3>
                  <h6>@bryceshaun</h6>
                  <div className="white-skew-btn">
                    <a
                      href={``}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <button>Catch on X</button>
                    </a>
                  </div>
                </div>
              </div>
              <div className="card-withou-pading gray-scale overflow-auto">
                <div className="grid grid-cols-[1fr_280px] gap-4 mb-4">
                  <div className="card">
                    <h3>New Pages</h3>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Flex>
      </Modal>
    </div>
  );
}

'use client';

import { Flex, Typography, Alert } from 'antd';
import Image from 'next/image';

const { Title } = Typography;

export default function SurveyLogin() {
  return (
    <div className="main-container mobile-survey">
      <Flex vertical className="gap-3">
        <div className="card">
          <Flex vertical className="w-[100%] m-auto">
            <Flex align="center" justify="center" className="mb-6">
              <Image src={"/logo.svg"} alt={"logo"} height={31} width={192} />
            </Flex>
            
                         <div className="text-center mb-6">
               <Title level={2} style={{ margin: 0, color: 'rgb(28, 29, 77)' }}>
                 Athlete Survey
               </Title>
             </div>

             <Alert
               message="Access Expired"
               description="Please contact andrew@verifiedathletics.com to get a new token"
               type="error"
               showIcon
               className="mb-4"
             />
           </Flex>
        </div>
      </Flex>
    </div>
  );
}

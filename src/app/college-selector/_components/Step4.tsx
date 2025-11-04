"use client";

import { Flex, Typography, Button, Select } from "antd";
import TextArea from "antd/es/input/TextArea";
import Image from "next/image";
import { useEffect, useState } from "react";
import ProgressPieChart from "../../survey/_components/ProgressPieChart";
import { supabase } from "@/lib/supabaseClient";
import { Checkbox } from "antd";
import { fetchSchoolsByMultipleDivisions } from '@/utils/schoolUtils';

type Step4Data = Record<string, never>;

interface Step4Props {
  surveyData: Step4Data;
  onComplete: (data: Step4Data) => void;
  onBack: () => void;
}

export default function Step4({ surveyData, onComplete, onBack }: Step4Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // University options and recruiting offers state
  const [universities, setUniversities] = useState<Array<{ id: string; name: string }>>([]);
  
  // Different types of recruiting interactions
  const [offers, setOffers] = useState<{ schoolId: string | null; walkOn: boolean }[]>([
    { schoolId: null, walkOn: false },
    { schoolId: null, walkOn: false },
    { schoolId: null, walkOn: false },
  ]);
  
  const [handWrittenNotes, setHandWrittenNotes] = useState<{ schoolId: string | null; walkOn: boolean }[]>([
    { schoolId: null, walkOn: false },
    { schoolId: null, walkOn: false },
  ]);
  
  const [coachCalls, setCoachCalls] = useState<{ schoolId: string | null; walkOn: boolean }[]>([
    { schoolId: null, walkOn: false },
    { schoolId: null, walkOn: false },
  ]);
  
  const [socialMediaMessages, setSocialMediaMessages] = useState<{ schoolId: string | null; walkOn: boolean }[]>([
    { schoolId: null, walkOn: false },
    { schoolId: null, walkOn: false },
  ]);
  
  const [coachVisits, setCoachVisits] = useState<{ schoolId: string | null; walkOn: boolean }[]>([
    { schoolId: null, walkOn: false },
    { schoolId: null, walkOn: false },
  ]);
  
  const [multipleVisits, setMultipleVisits] = useState<{ schoolId: string | null; walkOn: boolean }[]>([
    { schoolId: null, walkOn: false },
    { schoolId: null, walkOn: false },
  ]);

  // Load universities using existing utility function
  useEffect(() => {
    const loadUniversities = async () => {
      try {
        const schoolsData = await fetchSchoolsByMultipleDivisions(['D1', 'D2', 'D3', 'NAIA']);
        setUniversities(schoolsData);
      } catch (e) {
        console.error("Unexpected error loading universities:", e);
        setUniversities([]);
      }
    };
    loadUniversities();
  }, []);

  const handleSubmit = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    
    try {
      // Insert all recruiting interactions into offer table
      const athleteId: string | undefined = (surveyData as any)?.athleteId;

      if (!athleteId) {
        console.error("Missing athleteId in surveyData; cannot record offers");
      } else {
        const nowIso = new Date().toISOString();
        const allRowsToInsert = [];

        // Helper function to create rows for each interaction type
        const createRows = (interactions: { schoolId: string | null; walkOn: boolean }[], type: string) => {
          return interactions
            .filter(i => !!i.schoolId)
            .map(i => ({
              athlete_id: athleteId,
              school_id: i.schoolId as string,
              created_at: nowIso,
              source: "survey",
              type: type,
              walk_on: i.walkOn,
            }));
        };

        // Add all interaction types
        allRowsToInsert.push(...createRows(offers, "offer"));
        allRowsToInsert.push(...createRows(handWrittenNotes, "coach note"));
        allRowsToInsert.push(...createRows(coachCalls, "coach call"));
        allRowsToInsert.push(...createRows(socialMediaMessages, "coach message"));
        allRowsToInsert.push(...createRows(coachVisits, "coach visit"));
        allRowsToInsert.push(...createRows(multipleVisits, "coach multiple visit"));

        if (allRowsToInsert.length > 0) {
          const { error: offerInsertError } = await supabase
            .from("offer")
            .insert(allRowsToInsert);

          if (offerInsertError) {
            console.error("Error inserting recruiting interactions:", offerInsertError);
          }
        }
      }

      onComplete({});
    } catch (error) {
      console.error('Error in handleSubmit:', error);
      alert('Error proceeding to next step. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <Flex vertical className="servey-box">
      <Flex className="survey-head justify-between items-center mb-5">
        <Typography.Title level={3} className="italic">
          College Selector
        </Typography.Title>
        <Flex className="items-center">
          <Flex vertical className="items-end mr-3">
            <Typography.Title level={5} className="margin-0">
              4 out of 5
            </Typography.Title>
            <Typography.Text>Completed 80%</Typography.Text>
          </Flex>
          <ProgressPieChart currentStep={4} totalSteps={5} size={32} />
        </Flex>
      </Flex>

      <Flex
        vertical
        justify="center"
        align="center"
        className="py-4 px-5 survey-banner"
        style={{ marginBottom: "20px" }}
      >
        <Image
          className="mr-7"
          src={"/paper.svg"}
          alt={""}
          height={52}
          width={52}
        />
         <Flex vertical justify="center" align="center" className="text-center">
           <Typography.Title level={4} className="italic margin-0">
             Recruiting Information
           </Typography.Title>
          <Typography.Text>
            (leave blank if you have none)
          </Typography.Text>
         </Flex>
      </Flex>

      <Flex vertical className="items-center" style={{ marginTop: "10px" }}>
        <div className="flex flex-col gap-5 max-w-3xl mx-auto w-full">
          {/* Recruiting Information */}
          <Flex vertical className="mb-5 survey-textarea">
            <Typography.Title level={4}>
              What are your three best scholarship/roster spot offers?
            </Typography.Title>
            <Typography.Text type="secondary" style={{ marginBottom: '8px' }}>
              Only enter offers you have received. Entering false offers will delay your results.
            </Typography.Text>

            {offers.map((offer, idx) => (
              <Flex key={idx} align="middle" gap={8} style={{ marginBottom: 12 }}>
                <Select
                  className="w-full"
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  placeholder={`Select university #${idx + 1}`}
                  value={offer.schoolId || undefined}
                  onChange={(value) => {
                    const next = [...offers];
                    next[idx] = { ...next[idx], schoolId: value };
                    setOffers(next);
                  }}
                  options={universities.map(u => ({ value: u.id, label: u.name }))}
                />
                <Checkbox
                  checked={offer.walkOn}
                  onChange={(e) => {
                    const next = [...offers];
                    next[idx] = { ...next[idx], walkOn: e.target.checked };
                    setOffers(next);
                  }}
                >
                  Walk-On
                </Checkbox>
              </Flex>
            ))}
          </Flex>
           {/* Hand-written Notes */}
           <Flex vertical className="mb-5 survey-textarea">
             <Typography.Title level={4}>
               What are the two best schools to write you a hand-written note?
             </Typography.Title>
             <Typography.Text type="secondary" style={{ marginBottom: '8px' }}>
               Select up to two schools where coaches have sent you hand-written notes.
             </Typography.Text>

             {handWrittenNotes.map((note, idx) => (
               <Flex key={idx} align="middle" gap={8} style={{ marginBottom: 12 }}>
                 <Select
                   className="w-full"
                   showSearch
                   filterOption={(input, option) =>
                     (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                   }
                   placeholder={`Select school #${idx + 1}`}
                   value={note.schoolId || undefined}
                   onChange={(value) => {
                     const next = [...handWrittenNotes];
                     next[idx] = { ...next[idx], schoolId: value };
                     setHandWrittenNotes(next);
                   }}
                   options={universities.map(u => ({ value: u.id, label: u.name }))}
                 />
                 <Checkbox
                   checked={note.walkOn}
                   onChange={(e) => {
                     const next = [...handWrittenNotes];
                     next[idx] = { ...next[idx], walkOn: e.target.checked };
                     setHandWrittenNotes(next);
                   }}
                 >
                   Walk-On
                 </Checkbox>
               </Flex>
             ))}
           </Flex>

           {/* Coach Calls */}
           <Flex vertical className="mb-5 survey-textarea">
             <Typography.Title level={4}>
               What are the two best schools where a coach has called you?
             </Typography.Title>
             <Typography.Text type="secondary" style={{ marginBottom: '8px' }}>
               Select up to two schools where coaches have personally called you.
             </Typography.Text>

             {coachCalls.map((call, idx) => (
               <Flex key={idx} align="middle" gap={8} style={{ marginBottom: 12 }}>
                 <Select
                   className="w-full"
                   showSearch
                   filterOption={(input, option) =>
                     (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                   }
                   placeholder={`Select school #${idx + 1}`}
                   value={call.schoolId || undefined}
                   onChange={(value) => {
                     const next = [...coachCalls];
                     next[idx] = { ...next[idx], schoolId: value };
                     setCoachCalls(next);
                   }}
                   options={universities.map(u => ({ value: u.id, label: u.name }))}
                 />
                 <Checkbox
                   checked={call.walkOn}
                   onChange={(e) => {
                     const next = [...coachCalls];
                     next[idx] = { ...next[idx], walkOn: e.target.checked };
                     setCoachCalls(next);
                   }}
                 >
                   Walk-On
                 </Checkbox>
               </Flex>
             ))}
           </Flex>

           {/* Social Media Messages */}
           <Flex vertical className="mb-5 survey-textarea">
             <Typography.Title level={4}>
               What are the two best schools where a coach has messaged you on social media?
             </Typography.Title>
             <Typography.Text type="secondary" style={{ marginBottom: '8px' }}>
               Select up to two schools where coaches have contacted you via social media.
             </Typography.Text>

             {socialMediaMessages.map((message, idx) => (
               <Flex key={idx} align="middle" gap={8} style={{ marginBottom: 12 }}>
                 <Select
                   className="w-full"
                   showSearch
                   filterOption={(input, option) =>
                     (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                   }
                   placeholder={`Select school #${idx + 1}`}
                   value={message.schoolId || undefined}
                   onChange={(value) => {
                     const next = [...socialMediaMessages];
                     next[idx] = { ...next[idx], schoolId: value };
                     setSocialMediaMessages(next);
                   }}
                   options={universities.map(u => ({ value: u.id, label: u.name }))}
                 />
                 <Checkbox
                   checked={message.walkOn}
                   onChange={(e) => {
                     const next = [...socialMediaMessages];
                     next[idx] = { ...next[idx], walkOn: e.target.checked };
                     setSocialMediaMessages(next);
                   }}
                 >
                   Walk-On
                 </Checkbox>
               </Flex>
             ))}
           </Flex>

           {/* Coach Visits */}
           <Flex vertical className="mb-5 survey-textarea">
             <Typography.Title level={4}>
               What are the two best schools where a coach has visited you in person (at school or home)?
             </Typography.Title>
             <Typography.Text type="secondary" style={{ marginBottom: '8px' }}>
               Select up to two schools where coaches have visited you in person.
             </Typography.Text>

             {coachVisits.map((visit, idx) => (
               <Flex key={idx} align="middle" gap={8} style={{ marginBottom: 12 }}>
                 <Select
                   className="w-full"
                   showSearch
                   filterOption={(input, option) =>
                     (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                   }
                   placeholder={`Select school #${idx + 1}`}
                   value={visit.schoolId || undefined}
                   onChange={(value) => {
                     const next = [...coachVisits];
                     next[idx] = { ...next[idx], schoolId: value };
                     setCoachVisits(next);
                   }}
                   options={universities.map(u => ({ value: u.id, label: u.name }))}
                 />
                 <Checkbox
                   checked={visit.walkOn}
                   onChange={(e) => {
                     const next = [...coachVisits];
                     next[idx] = { ...next[idx], walkOn: e.target.checked };
                     setCoachVisits(next);
                   }}
                 >
                   Walk-On
                 </Checkbox>
               </Flex>
             ))}
           </Flex>

           {/* Multiple Visits */}
           <Flex vertical className="mb-5 survey-textarea">
             <Typography.Title level={4}>
               What are the two best schools where a coach has visited you in person multiple times (at school or home)?
             </Typography.Title>
             <Typography.Text type="secondary" style={{ marginBottom: '8px' }}>
               Select up to two schools where coaches have visited you multiple times.
             </Typography.Text>

             {multipleVisits.map((visit, idx) => (
               <Flex key={idx} align="middle" gap={8} style={{ marginBottom: 12 }}>
                 <Select
                   className="w-full"
                   showSearch
                   filterOption={(input, option) =>
                     (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                   }
                   placeholder={`Select school #${idx + 1}`}
                   value={visit.schoolId || undefined}
                   onChange={(value) => {
                     const next = [...multipleVisits];
                     next[idx] = { ...next[idx], schoolId: value };
                     setMultipleVisits(next);
                   }}
                   options={universities.map(u => ({ value: u.id, label: u.name }))}
                 />
                 <Checkbox
                   checked={visit.walkOn}
                   onChange={(e) => {
                     const next = [...multipleVisits];
                     next[idx] = { ...next[idx], walkOn: e.target.checked };
                     setMultipleVisits(next);
                   }}
                 >
                   Walk-On
                 </Checkbox>
               </Flex>
             ))}
           </Flex>
        </div>
      </Flex>

      <Flex gap="small" style={{ marginTop: "20px" }}>
        <Button
          onClick={onBack}
          className="next-servey"
        >
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          className="next-servey save-continue-green"
          loading={isSubmitting}
          disabled={isSubmitting}
          style={{ flex: 1 }}
        >
          {isSubmitting ? "Saving..." : "Continue"}
        </Button>
      </Flex>
    </Flex>
  );
}


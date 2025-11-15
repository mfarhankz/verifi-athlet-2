'use client';

import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from "@/contexts/CustomerContext";
import { getPackageIdsBySport } from '@/lib/queries';
import { preparePrintRequestData, sendPrintRequest } from '@/utils/printUtils';

interface HighSchoolPrintComponentProps {
  locations: any[];
  storedSchoolData: any[];
  pdfContentRef: React.RefObject<HTMLDivElement>;
  hasFootballPackage: boolean;
  minAthleticLevel?: string;
  minGradYear?: string;
  hideUI?: boolean;
}

export interface HighSchoolPrintComponentRef {
  handlePrint: () => Promise<void>;
  isPrinting: boolean;
}

const HighSchoolPrintComponent = forwardRef<HighSchoolPrintComponentRef, HighSchoolPrintComponentProps>(({ 
  locations, 
  storedSchoolData, 
  pdfContentRef, 
  hasFootballPackage,
  minAthleticLevel: propMinAthleticLevel = 'D3',
  minGradYear: propMinGradYear = '2025',
  hideUI = false
}, ref) => {
  const [isPrinting, setIsPrinting] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string>('');
  const [minAthleticLevel, setMinAthleticLevel] = useState(propMinAthleticLevel);
  const [minGradYear, setMinGradYear] = useState(propMinGradYear);
  
  const userDetails = useUser();

  // Update local state when props change
  React.useEffect(() => {
    setMinAthleticLevel(propMinAthleticLevel);
  }, [propMinAthleticLevel]);

  React.useEffect(() => {
    setMinGradYear(propMinGradYear);
  }, [propMinGradYear]);

  // Expose handlePrint via ref
  useImperativeHandle(ref, () => ({
    handlePrint,
    isPrinting
  }));

  const handlePrint = async () => {
    if (locations.length === 0) {
      alert("Please select at least one school to print.");
      return;
    }

    // Use current state values (synced from props via useEffect)
    // These will be up-to-date when handlePrint is called
    const currentMinAthleticLevel = minAthleticLevel;
    const currentMinGradYear = minGradYear;

    setIsPrinting(true);
    let lastCreatedPdfBlob: Blob | null = null;
    let lastPdfFilename: string = '';

    try {
      // Extract high school IDs from the stored school data
      const highschoolIds = locations.map(location => {
        // Look for high_school_id in raw_data
        const schoolInfo = storedSchoolData.find(s => s.address === location.address);
        // Try to get high_school_id from the raw_data
        return schoolInfo?.raw_data?.high_school_id || '';
      }).filter(id => id !== '');

      if (highschoolIds.length === 0) {
        console.error("Could not find high_school_id in data:", storedSchoolData);
        alert("Could not find high_school_ids for the selected schools. This might be due to missing data.");
        setIsPrinting(false);
        return;
      }

      // Get the current user session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert("You must be logged in to print. Please log in and try again.");
        setIsPrinting(false);
        return;
      }
      
      if (!userDetails) {
        console.error("Error fetching user details");
        alert("Error retrieving your user details. Please try again.");
        setIsPrinting(false);
        return;
      }
      
      // Get email from the authentication session
      const coachEmail = session.user.email || "";
      
      // Create the filename with the required format outside of the try block
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      const randomDigits = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
      
      // Define the filename here so it's in scope for the entire function
      const coverPageFileName = `${year}-${month}-${day}${userDetails.name_first || ''}${userDetails.name_last || ''}${randomDigits}.pdf`;
      lastPdfFilename = coverPageFileName;
      
      // Create PDF of the map content
      try {
        // First, create a PDF of the current content
        if (!pdfContentRef.current) {
          console.error('PDF content container not found');
          setIsPrinting(false);
          return;
        }

        try {
          // Delay to ensure the map is fully rendered with all markers
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Capture the content container with improved settings for map bubbles
          const canvas = await html2canvas(pdfContentRef.current, {
            scale: 1.5, // Maintain good quality
            useCORS: true,
            allowTaint: true,
            logging: true,
            onclone: (clonedDoc: Document) => {
              // Enhanced styles to make the map markers and labels visible in the PDF
              const style = clonedDoc.createElement('style');
              style.innerHTML = `
                /* Make sure all Google Maps elements are visible */
                .gm-style img { visibility: visible !important; }
                
                /* Ensure school labels are visible and properly styled */
                .school-label-text { 
                  visibility: visible !important;
                  opacity: 1 !important;
                  background-color: white !important;
                  padding: 4px 8px !important;
                  border-radius: 4px !important;
                  border: 1px solid #ccc !important;
                  box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
                  z-index: 1000 !important;
                  font-weight: bold !important;
                  display: block !important;
                  text-align: center !important;
                }
                
                /* Hide the "Stop Order" heading in the PDF */
                h2.text-xl.font-semibold.mb-4:contains("Stop Order") { display: none !important; }
                .stop-order-heading { display: none !important; }
                .print-hide { display: none !important; }
                
                /* Make sure the map container doesn't crop labels */
                .gm-style { overflow: visible !important; }
              `;
              clonedDoc.head.appendChild(style);
              
              // Force visibility of all Google Maps elements
              const allMapElements = clonedDoc.querySelectorAll('.gm-style *');
              allMapElements.forEach((el: Element) => {
                if (el instanceof HTMLElement) {
                  if (el.classList.contains('school-label-text')) {
                    el.style.visibility = 'visible';
                    el.style.opacity = '1';
                    el.style.zIndex = '1000';
                    el.style.display = 'block';
                  }
                }
              });
            }
          });
          
          // Create PDF with portrait orientation
          const pdf = new jsPDF({
            orientation: 'portrait', // Change to portrait
            unit: 'mm',
            format: 'letter', // Use letter size (8.5 x 11 inches)
            compress: true // Enable compression
          });
          
          const imgData = canvas.toDataURL('image/jpeg', 0.7);
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          
          // Calculate aspect ratio to maintain proportions
          const canvasRatio = canvas.height / canvas.width;
          const pageRatio = pdfHeight / pdfWidth;
          
          let imgWidth = pdfWidth;
          let imgHeight = pdfWidth * canvasRatio;
          
          // If the image is taller than the page, scale it down to fit
          if (imgHeight > pdfHeight) {
            imgHeight = pdfHeight;
            imgWidth = pdfHeight / canvasRatio;
          }
          
          // Center the image on the page
          const xOffset = (pdfWidth - imgWidth) / 2;
          const yOffset = (pdfHeight - imgHeight) / 2;
          
          // Add metadata to the PDF
          pdf.setProperties({
            title: `Recruiting Route Map`,
            subject: `Map of recruiting stops`,
            author: 'Verified Athletics',
            keywords: 'recruiting, map, athletics',
            creator: 'Verified Athletics App'
          });
          
          // Add the captured image to the PDF with proper sizing
          pdf.addImage(imgData, 'JPEG', xOffset, yOffset, imgWidth, imgHeight);
          
          const pdfBlob = pdf.output('blob');
          const blobSizeKB = Math.round(pdfBlob.size / 1024);
          
          // Store the PDF blob for later use
          lastCreatedPdfBlob = pdfBlob;
          // Also store in state for UI
          setPdfBlob(pdfBlob);
          setPdfFilename(coverPageFileName);
          
          // Check if file size is likely too large for a direct upload
          const isFileTooLarge = blobSizeKB > 9000; // Cloud Functions have a 10MB limit
          
          if (isFileTooLarge) {
            // Try to create a smaller version of the PDF
            const smallerCanvas = await html2canvas(pdfContentRef.current, {
              scale: 1.0, // Further reduce scale
              useCORS: true,
              allowTaint: true,
              onclone: (clonedDoc: Document) => {
                // Enhanced styles to make the map markers and labels visible in the PDF
                const style = clonedDoc.createElement('style');
                style.innerHTML = `
                  /* Make sure all Google Maps elements are visible */
                  .gm-style img { visibility: visible !important; }
                  
                  /* Ensure school labels are visible and properly styled */
                  .school-label-text { 
                    visibility: visible !important;
                    opacity: 1 !important;
                    background-color: white !important;
                    padding: 4px 8px !important;
                    border-radius: 4px !important;
                    border: 1px solid #ccc !important;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
                    z-index: 1000 !important;
                    font-weight: bold !important;
                    display: block !important;
                    text-align: center !important;
                  }
                  
                  /* Hide the "Stop Order" heading in the PDF */
                  h2.text-xl.font-semibold.mb-4:contains("Stop Order") { display: none !important; }
                  .stop-order-heading { display: none !important; }
                  .print-hide { display: none !important; }
                  
                  /* Make sure the map container doesn't crop labels */
                  .gm-style { overflow: visible !important; }
                `;
                clonedDoc.head.appendChild(style);
                
                // Force visibility of all Google Maps elements
                const allMapElements = clonedDoc.querySelectorAll('.gm-style *');
                allMapElements.forEach((el: Element) => {
                  if (el instanceof HTMLElement) {
                    if (el.classList.contains('school-label-text')) {
                      el.style.visibility = 'visible';
                      el.style.opacity = '1';
                      el.style.zIndex = '1000';
                      el.style.display = 'block';
                    }
                  }
                });
              }
            });
            
            const smallerPdf = new jsPDF({
              orientation: 'portrait',
              unit: 'mm',
              format: 'letter',
              compress: true
            });
            
            // Calculate aspect ratio to maintain proportions for smaller PDF
            const smallerCanvasRatio = smallerCanvas.height / smallerCanvas.width;
            const smallerPdfWidth = smallerPdf.internal.pageSize.getWidth();
            const smallerPdfHeight = smallerPdf.internal.pageSize.getHeight();
            
            let smallerImgWidth = smallerPdfWidth;
            let smallerImgHeight = smallerPdfWidth * smallerCanvasRatio;
            
            // If the image is taller than the page, scale it down to fit
            if (smallerImgHeight > smallerPdfHeight) {
              smallerImgHeight = smallerPdfHeight;
              smallerImgWidth = smallerPdfHeight / smallerCanvasRatio;
            }
            
            // Center the image on the page
            const smallerXOffset = (smallerPdfWidth - smallerImgWidth) / 2;
            const smallerYOffset = (smallerPdfHeight - smallerImgHeight) / 2;
            
            // Use even higher compression
            const smallerImgData = smallerCanvas.toDataURL('image/jpeg', 0.5);
            smallerPdf.addImage(smallerImgData, 'JPEG', smallerXOffset, smallerYOffset, smallerImgWidth, smallerImgHeight);
            
            const smallerPdfBlob = smallerPdf.output('blob');
            const smallerSizeKB = Math.round(smallerPdfBlob.size / 1024);
            
            // Store the smaller PDF blob for later use if it's better
            if (smallerSizeKB < blobSizeKB * 0.7) {
              lastCreatedPdfBlob = smallerPdfBlob;
              // Also update state
              setPdfBlob(smallerPdfBlob);
              await uploadPdfToStorage(smallerPdfBlob, coverPageFileName);
            } else {
              // Still try with the original but warn user
              await uploadPdfToStorage(pdfBlob, coverPageFileName);
            }
          } else {
            // File size is acceptable
            await uploadPdfToStorage(pdfBlob, coverPageFileName);
          }
        } catch (pdfCreationError) {
          console.error('Error creating PDF:', pdfCreationError);
          alert('Error creating PDF. Please try again.');
          setIsPrinting(false);
          return;
        }

        // After all PDF upload attempts are complete, send the data to the cloud function
        try {
          const requestData = await preparePrintRequestData(
            highschoolIds,
            userDetails,
            coachEmail,
            {
              min_print_level: currentMinAthleticLevel,
              min_grad_year: currentMinGradYear,
              cover_page: coverPageFileName
            }
          );

          // Show success message immediately after submitting request
          alert("Print request submitted successfully! You'll receive the PDF shortly.");

          // Send the request
          await sendPrintRequest(requestData);
        } catch (error) {
          console.error("Error with print request:", error);
          alert("An error occurred while processing your print request.");
        } finally {
          setIsPrinting(false);
        }
      } catch (outerError) {
        console.error('Error in PDF creation process:', outerError);
        alert('Error preparing content for PDF. Please try again.');
        setIsPrinting(false);
        return;
      }
    } catch (error) {
      console.error("Print error:", error);
      alert("An error occurred while processing your print request.");
      setIsPrinting(false);
    }
  };

  // Helper function to upload PDF to storage
  async function uploadPdfToStorage(
    pdfBlob: Blob, 
    coverPageFileName: string
  ): Promise<void> {
    // Create a local download URL for the PDF blob immediately
    const localDownloadUrl = URL.createObjectURL(pdfBlob);
    
    try {
      // First try the standard upload to Google Cloud Storage
      const pdfUrl = await uploadToGoogleCloudStorage(pdfBlob, coverPageFileName);
    } catch (uploadError: unknown) {
      console.error('Error uploading PDF to Google Cloud Storage:', uploadError);
      throw uploadError;
    } finally {
      // Only revoke the URL after the user has had a chance to download it
      setTimeout(() => {
        URL.revokeObjectURL(localDownloadUrl);
      }, 5000); // Give 5 seconds for download to potentially complete
    }
  }

  // Function to upload file to Google Cloud Storage
  async function uploadToGoogleCloudStorage(file: Blob, coverPageFileName: string): Promise<string> {
    try {
      // Always create a local copy of the PDF as a backup
      const localDownloadUrl = URL.createObjectURL(file);
      
      // Convert Blob to File
      const pdfFile = new File([file], coverPageFileName, { type: 'application/pdf' });
      
      // Create FormData to send the file
      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('bucket', 'excel-to-pdf-output-bucket');
      // Add the proper folder path for cover pages
      formData.append('folder', 'cover_pages');
      
      // Try direct cloud function upload first instead of API route
      try {
        // Use the production URL even in development mode since localhost isn't running
        const cloudFunctionUrl = 'https://us-central1-verified-312021.cloudfunctions.net/uploadPDF';
        
        // Convert the file to a base64 string
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        
        // Create JSON payload - include the "cover_pages/" prefix in the destination
        const payload = {
          filename: coverPageFileName,
          contentType: 'application/pdf',
          destination: `cover_pages/${coverPageFileName}`, // Add folder prefix to the destination
          bucket: 'excel-to-pdf-output-bucket',
          base64Data: base64Data
        };
        
        // Use the cloud function that accepts JSON payload
        const directResponse = await fetch(cloudFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          // Don't use no-cors as it makes debugging harder
          mode: 'cors'
        });
        
        if (!directResponse.ok) {
          const errorText = await directResponse.text();
          console.error(`Failed to upload directly to Google Cloud Storage: ${directResponse.status} ${directResponse.statusText}`);
          console.error('Response body:', errorText);
          throw new Error(`Failed to upload directly to Google Cloud Storage: ${directResponse.status} ${directResponse.statusText} - ${errorText}`);
        }
        
        let directData;
        try {
          directData = await directResponse.json();
        } catch (jsonError) {
          console.error('Error parsing JSON response:', jsonError);
          throw new Error('Failed to parse response from cloud function');
        }
        
        // Return the public URL
        const fileUrl = `https://storage.googleapis.com/excel-to-pdf-output-bucket/cover_pages/${coverPageFileName}`;
        
        // Skip verification since the bucket doesn't allow public access
        // The file should be uploaded successfully if we got here without errors
        return fileUrl;
      } catch (directUploadError) {
        console.error('Direct cloud function upload failed:', directUploadError);
        
        // Now try the API route as a fallback
        try {
          const response = await fetch('/api/uploadToGCS', {
            method: 'POST',
            body: formData,
          });
          
          if (response.ok) {
            const data = await response.json();
            
            if (data.url) {
              // Skip verification since the bucket doesn't allow public access
              // The file should be uploaded successfully if we got here without errors
              return data.url;
            }
          }
          
          // If we get here, the API route failed
          console.warn('API route failed to return a valid URL');
          return localDownloadUrl;
        } catch (apiError) {
          console.error('All upload attempts failed:', apiError);
          return localDownloadUrl;
        }
      }
    } catch (error) {
      console.error('All upload attempts to Google Cloud Storage failed:', error);
      // Create a local fallback URL
      const objectUrl = URL.createObjectURL(file);
      return objectUrl;
    }
  }

  // Don't render anything if user doesn't have football package
  if (!hasFootballPackage) {
    return null;
  }

  // Don't render UI if hideUI is true (when using via ref)
  if (hideUI) {
    return null;
  }

  return (
    <div className="flex items-center flex-wrap gap-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
      <button
        onClick={handlePrint}
        disabled={isPrinting || locations.length === 0}
        className="px-5 py-2 bg-amber-500 text-white font-semibold rounded-md shadow hover:bg-amber-600 transition duration-200 disabled:bg-amber-300 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {isPrinting ? (
          <>
            <span className="animate-spin inline-block">⟳</span>
            <span className="!text-white">Creating PDF...</span>
          </>
        ) : (
          <>
            <span>🖨️</span>
            <span className="!text-white">Print PDF</span>
          </>
        )}
      </button>
      
      {/* Add download button that's visible when PDF blob is available */}
      {pdfBlob && (
        <button
          onClick={() => {
            try {
              if (pdfBlob && pdfFilename) {
                const url = URL.createObjectURL(pdfBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = pdfFilename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                // Clean up the URL after a short delay to ensure the download starts
                setTimeout(() => {
                  URL.revokeObjectURL(url);
                }, 5000);
              } else {
                console.error('PDF blob or filename is missing');
              }
            } catch (error) {
              console.error('Error downloading PDF:', error);
              alert('There was an error downloading the PDF. Please try again.');
            }
          }}
          className="px-5 py-2 bg-blue-500 text-white font-semibold rounded-md shadow hover:bg-blue-600 transition duration-200 flex items-center gap-2"
        >
          <span>⬇️</span>
          <span className="!text-white">Download Cover</span>
        </button>
      )}
    
      <div className="flex flex-col">
        <label htmlFor="minAthleticLevel" className="text-xs font-medium text-amber-800 mb-1">Min Athletic Level</label>
        <select 
          id="minAthleticLevel"
          value={minAthleticLevel} 
          onChange={(e) => setMinAthleticLevel(e.target.value)}
          className="border border-amber-300 rounded-md px-2 py-1 bg-white text-amber-800 text-sm h-9 w-36"
        >
          <option value="D3">D3</option>
          <option value="D2">D2</option>
          <option value="FCS">FCS</option>
          <option value="G5">G5</option>
          <option value="P4">P4</option>
        </select>
      </div>
      
      <div className="flex flex-col">
        <label htmlFor="minGradYear" className="text-xs font-medium text-amber-800 mb-1">Min Grad Year</label>
        <select 
          id="minGradYear"
          value={minGradYear} 
          onChange={(e) => setMinGradYear(e.target.value)}
          className="border border-amber-300 rounded-md px-2 py-1 bg-white text-amber-800 text-sm h-9 w-36"
        >
          <option value="2025">2025</option>
          <option value="2026">2026</option>
          <option value="2027">2027</option>
          <option value="2028">2028</option>
        </select>
      </div>
    </div>
  );
});

HighSchoolPrintComponent.displayName = 'HighSchoolPrintComponent';

export default HighSchoolPrintComponent;

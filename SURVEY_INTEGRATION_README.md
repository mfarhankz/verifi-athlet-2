# Survey Integration with Athlete IDs

## Overview

The survey system has been updated to connect each survey response to a specific athlete in the database, similar to how the athlete-profile page works with athlete IDs.

## New URL Structure

### Dynamic Route
- **New URL**: `/survey/[athleteId]`
- **Example**: `/survey/12345` where `12345` is the athlete's ID

### Legacy Support
- **Old URL**: `/survey?id=12345` 
- **Behavior**: Automatically redirects to `/survey/12345`

## How It Works

### 1. Survey Page Structure
```
src/app/survey/
├── page.tsx                    # Legacy redirect handler
├── [athleteId]/
│   └── page.tsx               # Dynamic route page
└── _components/
    ├── SurveyContent.tsx      # Main survey logic
    ├── Step1.tsx             # Basic information
    ├── Step2.tsx             # Reasons and preferences
    ├── Step3.tsx             # Completion
    ├── IdealDevision.tsx     # Division selection
    └── SurveyStart.tsx       # Introduction
```

### 2. Data Flow
1. **Athlete ID** is extracted from the URL parameter
2. **Athlete data** is fetched using `fetchAthleteById()`
3. **Existing survey data** is pre-populated if available
4. **Survey responses** are saved to the `generic_survey` table with the athlete ID
5. **Survey data** is displayed in the athlete profile under the "Survey" tab

### 3. Database Integration
- Survey data is stored in the `generic_survey` table
- Each record is linked to an athlete via `athlete_id`
- Existing survey data is updated, new data is inserted
- Survey responses appear in the athlete profile automatically

## Survey Questions

### Step 1: Basic Information
- Address, City, State
- University/College selection
- Transfer reason
- Important factors for next school
- Highlight games for coaches
- College GPA
- Major importance
- HS GPA

### Step 2: Preferences
- Playing time (Major/Minor/Not a Reason)
- Ideal division selection
- Cost vs Academic reputation
- Closer to home preference
- Coaches preference
- Additional information

### Step 3: Division Selection
- FBS P5
- FBS G5
- FCS
- D2/NAIA
- D3
- JUCO

### Step 4: Completion
- Survey completion confirmation
- Athlete information display

## Usage Examples

### Linking to Survey
```javascript
// From athlete profile or any other page
const athleteId = "12345";
const surveyUrl = `/survey/${athleteId}`;

// Or using the legacy format (will redirect)
const legacyUrl = `/survey?id=${athleteId}`;
```

### Accessing Survey Data
```javascript
// Survey data is automatically available in athlete profile
const athlete = await fetchAthleteById(athleteId);
const surveyData = athlete.generic_survey?.[0];

// Survey data includes all the fields from the form
console.log(surveyData.transfer_reason);
console.log(surveyData.ideal_division);
console.log(surveyData.playing_time);
```

## Features

### ✅ Implemented
- Dynamic routing with athlete ID
- Database integration with athlete records
- Pre-population of existing survey data
- Multi-step survey form
- Real-time data saving
- Athlete information display
- Progress tracking
- Back/Next navigation
- Form validation
- Error handling

### 🔄 Data Persistence
- Survey data is collected across all steps but only saved when the survey is fully completed
- All data is submitted together in the final step
- New entries are created (existing data is not updated)
- Data is immediately available in athlete profile after final submission
- Survey tab shows/hides based on data availability

### 🎨 UI/UX
- Consistent with existing design
- Progress indicators
- Athlete information header
- Responsive design
- Loading states
- Error messages

## Database Schema

The survey data is stored in the `athlete_fact` table with the following structure:

```sql
CREATE TABLE athlete_fact (
  id SERIAL PRIMARY KEY,
  athlete_id UUID REFERENCES athlete(id),
  data_type_id INTEGER,
  value TEXT,
  date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT DEFAULT 'survey'
);
```

### Data Type IDs for Step 1:
- `1` - What year in school are you?
- `25` - Eligibility remaining (in years)
- `251` - Are you on scholarship?
- `2` - Primary Position
- `3` - Secondary Position
- `570` - Are you a grad transfer?
- `26` - Preferred contact method
- `571` - Email
- `27` - Cell
- `14` - Instagram
- `13` - Twitter
- `28` - When are you looking to transfer?
- `29` - Who will be helping you with your decision?
- `30` - Contact Info for anyone helping with your decision
- `8` - List any colleges you have attended prior to your current college
- `246` - Home address - Street
- `247` - Home address - City
- `24` - Home address - State
- `248` - Home address - Zip

### Data Type IDs for Step 2:
- `31` - In a few words tell us why you are transferring
- `32` - What is important to you as you look for your next school?
- `78` - What position are you most comfortable playing?
- `33` - What games should a coach watch when evaluating you?
- `234` - Are you playing summer league ball? If so, where?
- `34` - Are you open to walking on at a top program?
- `35` - GPA
- `10` - Major
- `36` - How important is your major?

### Data Type IDs for Step 3:
- `16` - What do you bat/throw?
- `230` - Perfect Game Profile link
- `231` - Prep Baseball Report Profile link
- `37` - Link to highlight tape (or best game)
- `15` - Club Team
- `79` - Club Coach Contact Info
- `30` - List any honors you've received

### Data Type IDs for Step 4:
- `40` - Playing time
- `41` - Want a higher level
- `42` - Coaches
- `46` - Better academics
- `43` - Ineligible – academics
- `44` - Ineligible – discipline
- `45` - Ineligible – other
- `47` - Major
- `48` - Closer to home

### Data Type IDs for Step 5:
- `49` - Ideal Division
- `50` - Looking for full scholarship only
- `51` - Distance from home
- `52` - Ideal campus size
- `53` - Campus location type
- `54` - Cost vs academic reputation
- `55` - Winning vs location
- `56` - Playing time vs winning a championship
- `57` - Cost vs campus type
- `58` - Playing time vs size
- `59` - Winning vs academics
- `60` - Winning a championship vs location
- `61` - Party vs academics
- `62` - Party vs winning
- `77` - Type of discipline from staff preferred
- `63` - Male to female
- `64` - HBCU (Historically Black Colleges and Universities)
- `65` - Faith-based school
- `66` - Preferred D1 school
- `67` - Preferred D2 school
- `68` - Preferred D3 school
- `69` - Preferred NAIA school
- `70` - Consent checkbox

### Special Handling:
- **Committed School**: When an athlete selects a committed school, an entry is created in the `offer` table with `source = 'survey'`
- **Preferred Schools**: D1, D2, D3, and NAIA school selections store the school ID in the `athlete_fact` table

## Security Considerations

- Athlete data is fetched using existing `fetchAthleteById()` function
- Survey data is linked to specific athlete IDs
- No unauthorized access to athlete data
- Form validation prevents invalid data submission

## Future Enhancements

- Email notifications when survey is completed
- Survey analytics and reporting
- Bulk survey management
- Survey templates
- Multi-language support 
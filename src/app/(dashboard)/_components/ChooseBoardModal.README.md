# ChooseBoardModal - Reusable Board Selection Modal

This modal provides a consistent interface for selecting recruiting boards (positions) throughout the app. Use it anywhere users can add players to boards.

## Features

- ✅ Search existing boards
- ✅ Create new boards on the fly
- ✅ Visual selection feedback
- ✅ Responsive design
- ✅ Reusable across the entire app

## Usage

### Basic Implementation

```tsx
import ChooseBoardModal from '@/app/(dashboard)/_components/ChooseBoardModal';
import { useState } from 'react';
import { useCustomer } from '@/contexts/CustomerContext';
import { supabase } from '@/lib/supabaseClient';

function YourComponent() {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { activeCustomerId } = useCustomer();
  
  // Your player/athlete data
  const playersToAdd = [{ id: 'athlete-123', ... }];
  
  const handleBoardSelected = async (boardName: string) => {
    try {
      // Insert into recruiting_board table
      const entries = playersToAdd.map(player => ({
        athlete_id: player.id,
        user_id: userDetails.id,
        customer_id: activeCustomerId,
        position: boardName,
        source: 'your-source' // e.g., 'portal', 'juco', 'pre-portal'
      }));
      
      const { error } = await supabase
        .from('recruiting_board')
        .insert(entries);
        
      if (error) {
        alert(`Error: ${error.message}`);
        return;
      }
      
      setShowSuccess(true);
      setIsModalVisible(false);
      // Clear selections, refresh data, etc.
    } catch (error) {
      console.error('Error adding to board:', error);
    }
  };
  
  return (
    <>
      <Button onClick={() => setIsModalVisible(true)}>
        Add to Board
      </Button>
      
      <ChooseBoardModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSelect={handleBoardSelected}
        customerId={activeCustomerId}
      />
    </>
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isVisible` | `boolean` | ✅ | Controls modal visibility |
| `onClose` | `() => void` | ✅ | Called when modal should close |
| `onSelect` | `(boardName: string) => void` | ✅ | Called with selected board name |
| `customerId` | `string \| null` | ✅ | Customer ID to fetch boards for |
| `title` | `string` | ❌ | Custom modal title (default: "Choose Board") |

## Integration Examples

### With Table Search (Multiple Players)

```tsx
const [selectedAthletes, setSelectedAthletes] = useState([]);

const handleBoardSelected = async (boardName: string) => {
  const entries = selectedAthletes.map(athlete => ({
    athlete_id: athlete.id,
    user_id: userDetails.id,
    customer_id: activeCustomerId,
    position: boardName,
    source: 'portal'
  }));
  
  await supabase.from('recruiting_board').insert(entries);
  setSelectedAthletes([]); // Clear selection
};
```

### With Single Player Profile

```tsx
const athlete = { id: '123', ... };

const handleBoardSelected = async (boardName: string) => {
  await supabase.from('recruiting_board').insert({
    athlete_id: athlete.id,
    user_id: userDetails.id,
    customer_id: activeCustomerId,
    position: boardName,
    source: 'portal'
  });
};
```

### Custom Title

```tsx
<ChooseBoardModal
  isVisible={isVisible}
  onClose={() => setIsModalVisible(false)}
  onSelect={handleBoardSelected}
  customerId={activeCustomerId}
  title="Add to Position"
/>
```

## Where It's Already Used

- ✅ `TableSearchContent.tsx` - Bulk add from search results
- ✅ `AthleteProfileContent.tsx` - Add from athlete profile
- ✅ `MobileAthleteProfileContent.tsx` - Add from mobile profile

## Future Integration Points

Consider using this modal in:
- Search results
- School profile pages
- Activity feed
- Coach view
- Any other place players are discovered

## Styling

Customize the modal appearance by editing `ChooseBoardModal.css`. The component uses:
- Modal overlay with backdrop
- Search input
- Board list with scroll
- Create new board input
- Success animations

## Database Structure

The modal works with the `recruiting_board_position` table:

```sql
CREATE TABLE recruiting_board_position (
  id UUID PRIMARY KEY,
  customer_id UUID NOT NULL,
  position_name TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ
);
```

Player additions go to the `recruiting_board` table with the selected `position` value.


import UserShortInfo from "./UserShortInfo";
import { data } from '@/apis/data';

export default function PlayerList() {
  return (
    <>
      <h4 className="mb-3">Similar Players</h4>
      <div className="grid grid-cols-2">
        <div className="players-list">
          <h5>New Joined Players</h5>
          <ul>
            {data.slice(0, 8).map((player) => (
              <li key={player.key}>
                <UserShortInfo
                  src={player.image}
                  height={80}
                  width={80}
                  fName={player.fname}
                  lName={player.lname}
                  average={player.avg}
                  rating={player.rating}
                  title={player.academy}
                  school={player.school}
                  schoolIcon={player.schoolIcon}
                />
              </li>
            ))}
          </ul>
        </div>
        <div className="players-list">
          <h5>Popular Players</h5>
          <ul>
            {data.slice(0, 8).map((player) => (
              <li key={player.key}>
                <UserShortInfo
                  src={player.image}
                  height={80}
                  width={80}
                  fName={player.fname}
                  lName={player.lname}
                  average={player.avg}
                  rating={player.rating}
                  title={player.academy}
                  school={player.school}
                  schoolIcon={player.schoolIcon}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

import { ALCalendar } from 'al-react/dist/src';
import FPo from "./Fpo";

const Home = () => {
  return (
    <div className="al-u-grid al-u-gap--lg" style={{height: "100%"}}>
      <div className="al-u-grid__item col:7@md">
        <FPo>
          Coming soon
        </FPo>
      </div>
      <ALCalendar className="al-u-grid__item col:5@md row:2@md"></ALCalendar>
      <div className="al-u-grid__item col:7@md">
        <FPo>
          Coming soon
        </FPo>
      </div>
      <div className="al-u-grid__item col:12@md">
        <FPo>
          Coming soon
        </FPo>
      </div>
    </div>
  );
};

export default Home;
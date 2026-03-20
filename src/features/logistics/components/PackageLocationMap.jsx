import BaseMap from '../../../components/molecules/BaseMap';
import VehicleMarker from '../../../components/molecules/VehicleMarker';

function PackageLocationMap({ position, title, subtitle }) {
  return (
    <BaseMap center={position || [-16.5, -68.15]} zoom={10} className="h-full w-full">
      {position && <VehicleMarker position={position} title={title} subtitle={subtitle} />}
    </BaseMap>
  );
}

export default PackageLocationMap;
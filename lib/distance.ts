/**
 * 2つの緯度経度座標間の距離を計算する（Haversine公式）
 * @param lat1 座標1の緯度
 * @param lon1 座標1の経度
 * @param lat2 座標2の緯度
 * @param lon2 座標2の経度
 * @returns 2点間の距離（キロメートル）
 */
export function getDistanceFromLatLonInKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // 地球の半径 (km)
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // 距離 (km)
  return distance;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
} 

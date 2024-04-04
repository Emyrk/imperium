export function printRoomName(roomName: string): string {
  return '<a href="#!/room/' + Game.shard.name + "/" + roomName + '">' + roomName + "</a>";
}

export function color(str: string, color: string): string {
  return `<font color='${color}'>${str}</font>`;
}

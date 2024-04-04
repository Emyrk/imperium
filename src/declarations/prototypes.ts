RoomObject.prototype.serialize = function () {
  const pos = {
    x: this.pos.x,
    y: this.pos.y,
    roomName: this.pos.roomName
  };
  return {
    pos: pos,
    ref: this.ref
  };
};

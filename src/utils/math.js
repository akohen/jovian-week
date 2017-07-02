module.exports = {
  // Rounds `n` to `precision` significant places
  round:function(n,precision) {
    shift = precision - Math.floor(Math.log10(n)) - 1
    return Number(Math.round(n+'e'+shift)+'e'+(-shift));
  },

  length: function(A) {
    return Math.sqrt(this.dot(A,A))
  },

  cross: function(A,B) {
    return [
      A[1] * B[2] - A[2] * B[1],
      A[2] * B[0] - A[0] * B[2],
      A[0] * B[1] - A[1] * B[0]
    ]
  },

  dot: function(A,B) {
    dot = 0
    for (var i = A.length - 1; i >= 0; i--) {
      dot += A[i] * B[i]
    }
    return dot
  },

  // rotates vector A by angle (in degrees) along z axis
  rotate: function(A,angle) {
    let rotationMatrix = [
        [Math.cos(angle), -Math.sin(angle), 0],
        [Math.sin(angle), Math.cos(angle), 0],
        [0, 0, 1]
    ]
    return A
  },

  multiply: function(A,B) {
      return A
  },

}
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

  ensureMatrix: function(A) {
    let result = A
    if(!Array.isArray(result)) result = [result]
    if(!Array.isArray(result[0][0])) result = [result]
    return result
  },

  transpose: function(mat) {
    let T = []
    let A = this.ensureMatrix(mat)
    for (var i = 0; i < A.length; i++) {
      for (var j=0; j<A[i].length; j++) {
        if(i == 0) T[j] = []
        T[j][i] = A[i][j]
      }
    }
    return T
  },

  printMatrix: function(mat) {
    for (var i = 0; i < mat.length; i++) {
      let line = ''
      for (var j=0; j<mat[i].length; j++) {
        line += mat[i][j] + ' '
      }
      console.log(line)
    }
  },

  multiply: function(A,B) {
    // Determine new matrix dimensions
    let lines = A.length // lines in the first matrix
    let cols = B[0].length // cols in the second matrix
    let m = B.length // must match the cols in A!

    // Fill matrix values
    let C = []

    for (var i = 0; i < lines; i++) {
      C[i] = []
      for (var j=0; j<cols; j++) {
        C[i][j] = 0
        for (var k=0; k<m; k++) {
          C[i][j] += A[i][k] * B[k][j] // Cij = ∑ Aik*Bkj
        }
      }
    }
    
    return C
  },

}
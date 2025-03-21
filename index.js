// Este arquivo serve como um fallback se o Python não funcionar adequadamente
// Ele simplesmente redireciona para o endpoint principal

module.exports = (req, res) => {
  res.statusCode = 302;
  res.setHeader('Location', '/api/main');
  res.end();
};

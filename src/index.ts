import { Lexer } from "./templateEngine/lexer";

const template = `
<!DOCTYPE html>
<html lang="en">
<head>
    <style>
        .test { color: red; }
    </style>
    <script>
        function test() {
            return '<div>' + "&lt;escaped&gt;" + '</div>';
        }
    </script>
        <![CDATA[Some CDATA content]]>
        <?php echo "Hello World"; ?>

</head>
<body>  
<!-- Comment with <tags> inside -->
 <script src="index.js"></script> 
</body>
</html>

`;

//var readable = createReadStream(__dirname + "/index.ts", {
//    encoding: "utf8",
//    highWaterMark: 16 * 1024,
//});
//readable.on("data", (data) => {
//    console.log(data);
//});
const lex = new Lexer(template);
const { errors, tokens } = lex.tokenize();
console.dir(tokens, { depth: 3 });
console.log("Errors:", JSON.stringify(errors, null, 2));

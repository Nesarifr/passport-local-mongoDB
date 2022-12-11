import express from 'express';
import * as HttpServer from 'http';
import * as IoServer from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { engine } from 'express-handlebars';
import {routerProducts, products}  from './src/router/productos.js';
import routerLogin  from './src/router/login.js';
import session from 'express-session';
import mongoose from "mongoose";
import {UserModel} from "./src/models/user.js"
import MongoStore from 'connect-mongo';
import passport from "passport";
import { normalize } from 'normalizr';

/* ------------------- import de clase contenedora y otros ------------------ */

import { ContenedorArchivo } from './src/managers/ContenedorArchivo.js';

/* --------------------------- constantes globales -------------------------- */

const chatsUsers = new ContenedorArchivo('chats')
const apiproducts = new ContenedorArchivo('products')
/* ------------------- constantes necesarias del servidor ------------------- */
const app = express();
const httpServer = new HttpServer.createServer(app); 
//io: servidor de Websocket
const io = new IoServer.Server(httpServer); //conectamos con el servidor principal Http
const __filename = fileURLToPath(import.meta.url); 
// ^^^ Esta es una variable especial que contiene toda la meta información relativa al módulo, de forma que podremos acceder al contexto del módulo.
const __dirname = path.dirname(__filename)
const PORT = process.env.PORT || 3000;

/* ------------------------------- configuracion del servidor ------------------------------- */

app.use(express.static(__dirname + '/src/public')) 
app.use(express.json());
app.use(express.urlencoded({extended: true}))

/* ------------------------------- Conexion a la base de datos ------------------------------- */
const mongoUrl= "COPIA1"

mongoose.connect(mongoUrl,{
    useNewUrlParser: true,
    useUnifiedTopology:true
},(error)=>{
    if(error) return console.log(`Hubo un error conectandose a la base ${error}`);
    console.log("conexion a la base de datos de manera exitosa")
});


/* ------------------------------- configuracion de SESSION ------------------------------- */

app.use(session({
    store: MongoStore.create({
        mongoUrl:`COPIA2`
    }),
    secret:"claveCualquiera",
    resave:false,
    saveUninitialized: false,
    cookie:{
        maxAge: 600000 //10 min
    }
}))

/* --------------------------- configurar passport -------------------------- */
app.use(passport.initialize()); //conectamos a passport con express.
app.use(passport.session());//vinculacion entre passport y las sesiones de nuestros usuarios.

/* ------------------- rutas /api/productos ------------------- */
app.use('/api/productos', routerProducts );
app.use('/api/login', routerLogin );

/* ---------------------- definicion motor de plantilla --------------------- */
app.engine('hbs', engine({extname: 'hbs'}))
app.set('views', path.join(__dirname,'/src/public/views')) //ubicacion de templates
app.set('view engine', 'hbs') // definitar motor para express

/* -------------------- Se crea el servidor y se enciende ------------------- */
httpServer.listen(PORT, ()=> console.log(`Server listening on port ${PORT}`));


/* -------------------------- serializar un usuario ------------------------- */
passport.serializeUser((user,done)=>{
    done(null, user.id)
});


/* --------- GET '/' -> devuelve todos los productos, conecto con handlebars --------- */


const  checkUserLogged = async (req,res,next)=>{
    if(req.session.username){
        next();
    } else{
        return res.redirect('/api/login')
    }
}

app.get('/', async (req, res)=>{
    try{
        if(!req.isAuthenticated()){
            
            return res.redirect('./api/login')
        }
        const user = req.session.username
        const productosAll = await apiproducts.getAllRandom()
        if ( productosAll){
            return res.render('home', {productos : productosAll , user: user})
        }  else res.render('partials/error', {productos: {error: 'No existe una lista de productos todavia'}})  
    }
    catch(error){
        res.status(500).send('Error en el servidor')
    }
});


/* ---------------------- Websocket --------------------- */
io.on('connection', async (socket)=>{
    //productos iniciales / ya guardados
    socket.emit('allProducts', await apiproducts.getAllRandom())
    //nuevo producto
    socket.on('newProduct', async newProducto =>{
        newProducto.price = parseFloat(newProducto.price);
        await products.save(newProducto)
        const productosAll = await products.getAllRandom()
        io.sockets.emit('refreshTable', productosAll)
        }
    )
})
//mensajes hasta el inicio
//     socket.emit('allMensajes', await normalizarMensajes())
//nuevo msj
//     socket.on('newMsjChat', async newMsjChat =>{
//         await chatsUsers.save(newMsjChat);
//         const msjsAll = await normalizarMensajes()
//         io.sockets.emit('refreshChat', msjsAll )
//     })

// })

/* ------------------------- normalizar los mensajes ------------------------ */
/* --------------------------- schemas de mensajes -------------------------- */


/* ------------------------- aplicando normalizacion ------------------------ */
// const normalizarChat = (msjs)=>{
//     const normalizeData = normalize({id:"Chat-Historial", chat: msjs}, chatSchema);
//     return normalizeData;
// }

// const normalizarMensajes = async ()=>{
//     const results = await chatsUsers.getAll();
//     const mensajesNormalizados = normalizarChat(results);
//     return mensajesNormalizados;
// }




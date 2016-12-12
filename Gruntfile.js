/*

 Configuracion:
    targetSRS: Sistema de Referencia en el que se quieren las coordenadas de la geocodificacion.
    inputFile: Nombre del fichero a geocodificar, sin extension.
    inputDelimiter: Separador de columna del fichero de entrada.
    outputDelimiter: Separador de columna a usar en los ficheros de salida. 
    cols: Array con los nombres de las columnas que forman la dirección, en el siguiente orden - tipo de via/nombre/portal.
    colIne: El nombre de la columna que contiene el codigo INE.
    
    Se da por supuesto que las respuestas del geocoder vienen ordenadas de mayor a menor similaridad en los casos en que
    se devuelva más de una dirección geocodificada.
    
*/

module.exports = function(grunt){
  grunt.config.init({
  
    geocodifica: {
      direccion: [],
    },
    
    normaliza: {
      direccion: [],
    },
    
    imprime: {
      direccion: [],
    },
    
    exporta: {
      imagenes: [],
    },

    impresion:{
        host_impresion: 'http://sigc.int.i-administracion.junta-andalucia.es/geoprint/pdf/print.pdf?spec=',
        DPI: 150, // 56,90,127,150,300
        outputFormat: 'png', // png, jpg, pdf
        layout: 'A4 simple vertical'
    },
    
    variables: {
      targetSRS: 'EPSG:25830',
      inputFile: 'bibliotecas20',
      inputDelimiter:'%',
      outputDelimiter:'%',
      cols:['Direccion','Provincia','Municipio'],
      otrasCols:['Nombre'], // Otras columnas del csv original que se quieran mantener
      colIne: null,
      // Variables del Sistema, NO TOCAR
      host: 'http://ws079.juntadeandalucia.es/EXT_PUB_CallejeroREST/',
      operacion: 'geocoderMunProvSrs',
      operacion_normalizar: 'normalizar',
      cols_normalizadas:['TVIAB','NVIAB','NCALB'],
      impa: '{\"units\":\"m\",\"srs\":\"EPSG:25830\",\"layout\":\"<%= impresion.layout  %>\",\"dpi\":\"<%= impresion.DPI  %>\",\"outputFormat\":\"<%= impresion.outputFormat  %>\",\"outputFilename\":\"mapea_${yyyy-MM-dd_hhmmss}\",\"layers\":[{\"baseURL\":\"http:\/\/www.callejerodeandalucia.es\/servicios\/base\/wms?\",\"opacity\":1,\"singleTile\":false,\"type\":\"WMS\",\"layers\":[\"CDAU_base\"],\"format\":\"image\/png\",\"styles\":[\"\"],\"customParams\":{\"TRANSPARENT\":\"false\",\"ISWMC\":\"ok\"}},{\"baseURL\":\"http:\/\/www.callejerodeandalucia.es\/servicios\/cdau\/wms?Buffer=5\",\"opacity\":1,\"singleTile\":true,\"type\":\"WMS\",\"layers\":[\"CDAU_wms\"],\"format\":\"image\/png\",\"styles\":[\"\"],\"customParams\":{\"TRANSPARENT\":\"true\",\"ISWMC\":\"ok\"}},{\"baseURL\":\"http:\/\/mapea-sigc.juntadeandalucia.es\/Componente\/javascriptVisor\/Mapea\/theme\/default\/images\/search\/pointer.png\",\"opacity\":1,\"name\":\"pointer\",\"type\":\"Image\",\"extent\":',
      impb: '}],\"pages\":[{\"center\":',
        impc: ',\"scale\":731,\"rotation\":0}]}'
    }
  });

  // PROCESA CSV
  grunt.registerTask('extrae', 'Extrae direcciones de un csv', function() {
  
    console.time("procesa_csv");    
    var done = this.async();
    
    csv = require('fast-csv'),
    dir_arr = [];
 
    csv
        .fromPath(grunt.config('variables.inputFile')+'.csv', {delimiter: grunt.config('variables.inputDelimiter'), headers: true})
        .on("data", function(data){
             var row = [];
             grunt.config('variables.cols').forEach(function(columna,i,arr){
                 row.push(data[grunt.config('variables.cols')[i]]);    
             });
             
             // Metemos el resto de columnas alfanumericas
             grunt.config('variables.otrasCols').forEach(function(columna,i,arr){
                 row.push(data[grunt.config('variables.otrasCols')[i]]);    
             });
             
             dir_arr.push(row);            
        })
        .on("end", function(){
            // Inicialmente, actualizamos los arrays: el de normalización, geocodificación e impresion
            grunt.config.set('geocodifica.direccion',dir_arr);
            grunt.config.set('normaliza.direccion',dir_arr);
            grunt.config.set('imprime.direccion',dir_arr);
            grunt.config.set('exporta.imagenes',dir_arr);
            console.timeEnd("procesa_csv");
            done();
         });
  });

  // NORMALIZA
  grunt.registerMultiTask('normaliza', 'Normaliza direcciones', function() {
  
   console.time("normaliza");
   
   var nor_arr = [],
    http = require('http'),
    done = this.async(),
    responses = 0;
    
   this.data.forEach(function(direccion,i,arr){
   
       var cadena = '';
       for(i=0;i<grunt.config('variables.cols').length;i++){
            cadena += direccion[i] + ',';
       }
       //grunt.log.writeln('Cadena es: ' + encodeURI(cadena));
       
       var body = [];
       url = grunt.config('variables.host');
       url += grunt.config('variables.operacion_normalizar') + '?cadena=' + encodeURI(cadena);
       
       http.get(url, function(res) {
       
        res.setEncoding('utf8'); 
        res
        .on('data', function(data){
          body.push(data);
        })
        .on('end', function () {
         
            grunt.log.writeln('Normalizando la dirección:' + cadena);  
            var cuerpo = JSON.parse(body.join());          

            // MUNPROV
            var aux_arr = [];
            aux_arr.push(cuerpo.normalizarResponse.normalizarReturn.tipoVia,
                        cuerpo.normalizarResponse.normalizarReturn.nombreVia,
                        cuerpo.normalizarResponse.normalizarReturn.numeroPortal,
                        cuerpo.normalizarResponse.normalizarReturn.municipio,
                        cuerpo.normalizarResponse.normalizarReturn.provincia
                        );
            
            // metemos los campos alfa
            for(i=0;i<grunt.config('variables.otrasCols').length;i++){
                 var pos = grunt.config('variables.cols').length + i;
                 aux_arr.push(direccion[pos]);
             }
         
            nor_arr.push(aux_arr);
         
            // Si se han procesado todas los peticiones, hemos acabado
            if(responses++ == arr.length - 1)
                csv
                   .writeToPath(grunt.config('variables.inputFile') + '_normalizado.csv', nor_arr, {headers: true,delimiter: grunt.config('variables.outputDelimiter')})
                   .on("finish", function(){
                       console.timeEnd("normaliza");
                       grunt.config.set('geocodifica.direccion',nor_arr);
                       grunt.config.set('imprime.direccion',nor_arr);
                       grunt.config.set('exporta.imagenes',nor_arr);
                       done();
                   });
         });
      }).on('error', function (err) {
        grunt.warn('Revisar la url: <'+ url +'>.');
        done(err);
      });
    });
  });

  // GEOCODIFICA
  grunt.registerMultiTask('geocodifica', 'Geocodifica direcciones', function() {
  
   //grunt.log.writeln('Geocodificando...');
   console.time("geocodifica");
   
   var http = require('http'),
    done = this.async(),
    responses = 0,
    geo_arr = [];
    
   this.data.forEach(function(direccion,i,arr){
       
       var body = [];
       url = grunt.config('variables.host');
       // MUNPROV
       url += grunt.config('variables.operacion') + '?&streettype=' + direccion[0] + '&streetname=' +  encodeURI(direccion[1]) + '&streetnumber=' + direccion[2] + '&municipio='+ encodeURI(direccion[3]) + '&provincia='+ direccion[4] + '&srs=' + grunt.config('variables.targetSRS');
       
       http.get(url, function(res) {
       
        res.setEncoding('utf8');
        
        res.on('data', function(data){
          body.push(data);
        })
        .on('end', function () {
         
            grunt.log.writeln('Procesando la dirección:' + direccion);  
            var cuerpo = JSON.parse(body.join());                 
            
            var aux_arr = [];
            
            aux_arr.push(direccion,
                        cuerpo.geocoderMunProvSrsResponse.geocoderMunProvSrsReturn.geocoderMunProvSrsReturn.streetType,
                        cuerpo.geocoderMunProvSrsResponse.geocoderMunProvSrsReturn.geocoderMunProvSrsReturn.streetName,   
                        cuerpo.geocoderMunProvSrsResponse.geocoderMunProvSrsReturn.geocoderMunProvSrsReturn.streetNumber,
                        cuerpo.geocoderMunProvSrsResponse.geocoderMunProvSrsReturn.geocoderMunProvSrsReturn.locality,
                        cuerpo.geocoderMunProvSrsResponse.geocoderMunProvSrsReturn.geocoderMunProvSrsReturn.coordinateX,
                        cuerpo.geocoderMunProvSrsResponse.geocoderMunProvSrsReturn.geocoderMunProvSrsReturn.coordinateY,
                        cuerpo.geocoderMunProvSrsResponse.geocoderMunProvSrsReturn.geocoderMunProvSrsReturn.resultType,   
                        cuerpo.geocoderMunProvSrsResponse.geocoderMunProvSrsReturn.geocoderMunProvSrsReturn.similarity);
                        
            // metemos los campos alfa
            for(i=0;i<grunt.config('variables.otrasCols').length;i++){
                 var pos = 5 + i; // 'direccion' aqui es el que calculo la tarea Normaliza
                 aux_arr.push(direccion[pos]);
             }
         
            geo_arr.push(aux_arr);
            
            // Si se han procesado todas los peticiones, hemos acabado
            if(responses++ == arr.length - 1)
                csv
                   .writeToPath(grunt.config('variables.inputFile') + '_geocodificado.csv', geo_arr, {headers: true,delimiter: grunt.config('variables.outputDelimiter')})
                   .on("finish", function(){
                       console.timeEnd("geocodifica");
                       grunt.config.set('imprime.direccion',geo_arr);
                       grunt.config.set('exporta.imagenes',geo_arr);
                       done();
                    });
         });
      }).on('error', function (err) {
        grunt.warn('Revisar la url: <'+ url +'>.');
        
        if(responses++ == arr.length - 1)
                csv
                   .writeToPath(grunt.config('variables.inputFile') + '_geocodificado.csv', geo_arr, {headers: true,delimiter: grunt.config('variables.outputDelimiter')})
                   .on("finish", function(){
                       console.timeEnd("geocodifica");
                       grunt.config.set('imprime.direccion',geo_arr);
                       grunt.config.set('exporta.imagenes',geo_arr);
                       done();
                    });
        done(err);
        
      });
    });
  });
  
  
  // IMPRIME
  grunt.registerMultiTask('imprime', 'Imprime imagenes', function() {
  
   console.time("imprime");
   
   var http = require('http'),
    fs = require('fs'),
    done = this.async(),
    responses = 0,
    geo_arr = [],
    img_arr =[],
    peticiones = 0;
    
   this.data.forEach(function(direccion,i,arr){
   
   img_arr[i] = direccion;
   
   if(direccion[5] != undefined){
       
       var body = [];
       var dirText = direccion[1] + '_' + direccion[2] + '_' + direccion[3] + '_' + direccion[4] + '_' + direccion[7] ;
       
       url = grunt.config('impresion.host_impresion');
       url +=  encodeURIComponent(grunt.config('variables.impa')) + '[' + (direccion[5] -3) +  ',' + (direccion[6] -3) + ',' + (direccion[5] +3) + ',' + (direccion[6]+3) +']' +  encodeURIComponent(grunt.config('variables.impb')) + '[' + direccion[5] +  ',' + direccion[6] +']' +  encodeURIComponent(grunt.config('variables.impc'));
       grunt.log.writeln('Pidiendo impresion para: ' + dirText);
       //grunt.log.writeln('Url: ' + url);
       
       http.get(url, function(res) {
       
        res.setEncoding('binary');
        
        res.on('data', function(data){
          body+= data;
        })
        .on('end', function () {
            grunt.log.writeln('\nProcesando la imagen ' + dirText);  
         
            var options = {
                  encoding: 'binary'
                };
             grunt.file.write('images/mapa_' + dirText + '.' + grunt.config('impresion.outputFormat'), body, options);
             // registramos el nombre de la imagen
             img_arr[i].push('mapa_' + dirText + '.' + grunt.config('impresion.outputFormat'));
             
             // Si se han procesado todas los peticiones, hemos acabado
              grunt.log.writeln('Response nº: ' + (responses+1) + ' de ' + (arr.length - 1));
             if(responses++ == arr.length - 1){
                console.timeEnd("imprime");
                grunt.config.set('exporta.imagenes',img_arr);
                done();
              }       
         });
      }).on('error', function (err) {
        // hay q contar la respuesta?
        //responses++;
        grunt.warn('ERROR: Revisar la url: <'+ url +'>.');
        done(err);
      });
      
      }//endif
      else
      {
          // Aunque no se haya geocodificado, se cuenta como procesada
          responses++;
      }
    });
  });
  
  // EXPORTA
  grunt.registerMultiTask('exporta', 'Exporta imagenes como html', function() {
  
    var done = this.async(),
    responses =0;
    
    // En cada posicion del array tenemos un array con todos los datos de cada direccion: originales, geocodificados,
    // siendo el ultimo elemento la imagen generada
    this.data.forEach(function(imagen,i,arr){
   
      grunt.log.writeln('Generando fichero html nº ' + i);
      var content = '<!DOCTYPE html><html><meta charset="utf-8"><body>';
      // elementos de texto
      var posimagen = imagen.length-1;
      for(j=0;j<posimagen;j++){
            content += "<p>" + imagen[j]  + "</p>\n";
      }
      // elemento imagen
      content += '<img  src=\"' + imagen[posimagen]  + '\"/>';
      // escribimos el fichero en disco
      grunt.file.write('images/' + i +'.html', content,{encoding: 'UTF-8'}); 
      content += '</body>';
      // si se han procesado todos los elementos, el proceso ha finalizado
       if(responses++ == arr.length - 1){
            grunt.log.writeln('Proceso FINALIZADO'); 
            done();
         }
      });
  });
  
 grunt.registerTask('default', ['extrae','normaliza','geocodifica','imprime','exporta']);
}




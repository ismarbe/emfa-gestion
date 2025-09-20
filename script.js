// Gestión de RLSE - Sistema de datos local con archivos JSON

class RLSEManager {
    constructor() {
        this.data = [];
        this.currentFileName = '';
        this.currentPage = 1;
        this.recordsPerPage = 10;
        this.filteredData = [];
        this.isEditing = false;
        this.editingIndex = -1;
        this.sortField = 'proyecto';
        this.sortOrder = 'desc'; // desc o asc
        this.hasUnsavedChanges = false;

        // Inicializar en el siguiente tick para asegurar que el DOM esté listo
        setTimeout(() => {
            this.initializeEventListeners();
            this.initializeKeyboardShortcuts();
            this.initializeTheme();
            this.setupValidation();
            this.loadJornadas(); // Cargar las jornadas desde el archivo
            this.refreshTable(); // Mostrar tabla vacía inicial
        }, 0);
    }

    initializeEventListeners() {
        // Eventos de archivo
        document.getElementById('fileInput').addEventListener('change', (e) => this.loadFile(e));
        document.getElementById('createNewBtn').addEventListener('click', () => this.createNewFile());
        document.getElementById('saveFileBtn').addEventListener('click', () => this.saveFile());
        document.getElementById('saveAsBtn').addEventListener('click', () => this.saveAsFile());
        document.getElementById('exportCsvBtn').addEventListener('click', () => this.exportToCsv());
        document.getElementById('csvInput').addEventListener('change', (e) => this.importFromCsv(e));

        // Eventos de tema y atajos
        document.getElementById('themeToggle').addEventListener('click', () => this.toggleTheme());
        document.getElementById('shortcutsBtn').addEventListener('click', () => this.showShortcuts());
        document.getElementById('closeShortcutsBtn').addEventListener('click', () => this.hideShortcuts());

        
        // Eventos de operaciones
        document.getElementById('addBtn').addEventListener('click', () => this.showAddForm());
        document.getElementById('modifyBtn').addEventListener('click', () => this.showModifySearch());
        document.getElementById('deleteBtn').addEventListener('click', () => this.showDeleteSearch());
        document.getElementById('searchBtn').addEventListener('click', () => this.showSearchPanel());
 
        // Eventos de formulario

        document.getElementById('recordForm').addEventListener('submit', (e) => this.handleFormSubmit(e));
        document.getElementById('cancelBtn').addEventListener('click', () => this.hideFormPanel());
        document.getElementById('closeFormBtn').addEventListener('click', () => this.hideFormPanel());

        // Eventos de búsqueda

        document.getElementById('executeSearchBtn').addEventListener('click', () => this.executeSearch());
        document.getElementById('clearSearchBtn').addEventListener('click', () => this.clearSearch());
        document.getElementById('closeSearchBtn').addEventListener('click', () => this.hideSearchPanel());

        // Eventos de búsqueda para modificar
        document.getElementById('executeModifySearchBtn').addEventListener('click', () => this.executeModifySearch());
        document.getElementById('cancelModifySearchBtn').addEventListener('click', () => this.hideModifySearchPanel());
        document.getElementById('closeModifySearchBtn').addEventListener('click', () => this.hideModifySearchPanel());
 
        // Eventos de búsqueda para borrar
        document.getElementById('executeDeleteSearchBtn').addEventListener('click', () => this.executeDeleteSearch());
        document.getElementById('cancelDeleteSearchBtn').addEventListener('click', () => this.hideDeleteSearchPanel());
        document.getElementById('closeDeleteSearchBtn').addEventListener('click', () => this.hideDeleteSearchPanel());

        // Eventos de paginación y ordenamiento

        document.getElementById('prevPageBtn').addEventListener('click', () => this.previousPage());
        document.getElementById('nextPageBtn').addEventListener('click', () => this.nextPage());
        document.getElementById('sortField').addEventListener('change', (e) => this.changeSortField(e.target.value));
        document.getElementById('sortOrder').addEventListener('click', () => this.toggleSortOrder());
 
        // Eventos de modal de confirmación
        document.getElementById('confirmYes').addEventListener('click', () => this.confirmAction());
        document.getElementById('confirmNo').addEventListener('click', () => this.hideConfirmModal());

 

        // Evento para búsqueda en tiempo real
        document.getElementById('searchValue').addEventListener('input', () => this.executeSearch());

        // Eventos de cambios no guardados
        window.addEventListener('beforeunload', (e) => {
            if (this.hasUnsavedChanges) {
                e.preventDefault();
                e.returnValue = '';
            }
        });
    }

 

    // Gestión de archivos
    loadFile(event) {
        const file = event.target.files[0];
        if (!file) {
            console.log('No se seleccionó ningún archivo');
            return;
        }

        // Validar que es un archivo
        if (!file.name || !file.size) {
            this.showAlert('El archivo seleccionado no es válido.', 'error');
            console.error('Archivo inválido:', file);
            return;
        }

        // Validar extensión
        if (!file.name.toLowerCase().endsWith('.json')) {
            this.showAlert('Por favor, selecciona un archivo JSON válido.', 'error');
            return;
        }

        // Validar tamaño (máximo 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showAlert('El archivo es demasiado grande. Máximo 10MB.', 'error');
            return;
        }

        console.log(`Cargando archivo: ${file.name} (${file.size} bytes)`);

        const reader = new FileReader(); 

        // Agregar manejo de errores del FileReader
        reader.onerror = (e) => {
            console.error('Error leyendo archivo:', e);
            this.showAlert('Error al leer el archivo. Inténtalo de nuevo.', 'error');
        };
 
        reader.onabort = (e) => {
            console.error('Lectura de archivo abortada:', e);
            this.showAlert('Lectura del archivo cancelada.', 'error');
        };
 
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                // Validar que el contenido no esté vacío
                if (!content || content.trim() === '') {
                    this.showAlert('El archivo está vacío.', 'error');
                    return;
                }
 
                console.log('Contenido del archivo:', content.substring(0, 100) + '...');
 
                // Intentar parsear JSON
                let parsedData;
                try {
                    parsedData = JSON.parse(content);
                } catch (parseError) {
                    console.error('Error de JSON:', parseError);
                    this.showAlert('El archivo no contiene JSON válido. Verifica el formato.', 'error');
                    return;
                }

                // Validar que es un array
                if (!Array.isArray(parsedData)) {
                    this.showAlert('El archivo JSON debe contener un array de registros.', 'error');
                    return;
                }

                // Validar estructura de los registros
                if (parsedData.length > 0) {
                    const requiredFields = ['proyecto', 'fecha', 'ubicacion', 'arbitro', 'estado', 'resultado', 'descripcion'];
                    const firstRecord = parsedData[0];
                    const missingFields = requiredFields.filter(field => !(field in firstRecord));
                   
                    if (missingFields.length > 0) {
                        this.showAlert(`El archivo JSON no tiene la estructura correcta. Faltan campos: ${missingFields.join(', ')}`, 'error');
                        return;
                    }
                }
 
                // Todo está bien, cargar los datos
                this.data = parsedData;
                this.currentFileName = file.name;
                this.filteredData = [...this.data]; // Resetear filtros
                this.currentPage = 1; // Resetear página
                this.hasUnsavedChanges = false; // Marcar como guardado
                this.updateFileInfo(`Archivo cargado: ${this.currentFileName}`);
                this.enableOperations();
                this.refreshTable();

                console.log(`Archivo cargado exitosamente: ${parsedData.length} registros`);
                this.showAlert(`Archivo ${this.currentFileName} cargado correctamente (${parsedData.length} registros).`, 'success');

            } catch (error) {
                console.error('Error procesando archivo:', error);
                this.showAlert('Error inesperado al procesar el archivo. Inténtalo de nuevo.', 'error');
            }
        };

        // Leer archivo como texto con encoding UTF-8
        reader.readAsText(file, 'UTF-8');

        // Limpiar el input para permitir recargar el mismo archivo
        setTimeout(() => {
            event.target.value = '';
        }, 100);
    }

    async createNewFile() {
        // Verificar si hay cambios sin guardar
        if (this.data.length > 0) {
            if (!confirm('¿Quieres crear un nuevo archivo? Se perderán los datos actuales si no los has guardado.')) {
                return;
            }
        }
 
        const fileName = prompt('Introduce el nombre del nuevo archivo (sin extensión):', 'Nombre');
        if (fileName && fileName.trim()) {
            const finalFileName = fileName.trim().endsWith('.json') ? fileName.trim() : `${fileName.trim()}.json`;
           
            // Intentar crear y guardar inmediatamente el archivo en la ubicación seleccionada
            if ('showSaveFilePicker' in window) {
                try {
                    const fileHandle = await window.showSaveFilePicker({
                        suggestedName: finalFileName,
                        types: [{
                            description: 'Archivos JSON',
                            accept: { 'application/json': ['.json'] }
                        }]
                    });
 
                    // Crear archivo vacío inicial
                    this.data = [];
                    const emptyData = JSON.stringify(this.data, null, 2);
                    const writable = await fileHandle.createWritable();
                    await writable.write(emptyData);
                    await writable.close();

                    this.currentFileName = fileHandle.name;
                    this.updateFileInfo(`Nuevo archivo creado: ${this.currentFileName}`);
                    this.enableOperations();
                    this.refreshTable();
                    this.showAlert(`Nuevo archivo ${this.currentFileName} creado y guardado en la ubicación seleccionada.`, 'success');
                    return;
                } catch (error) {
                    if (error.name === 'AbortError') {
                        return; // Usuario canceló
                    }
                    console.error('Error al crear archivo:', error);
                    this.showAlert('Error al usar el selector de archivos. Creando archivo temporal.', 'warning');
                }
            } else {
                this.showAlert('Tu navegador no soporta el selector de ubicación. Usa "Guardar como..." después de crear el archivo.', 'info');
            }
 
            // Fallback: crear archivo temporal
            this.data = [];
            this.currentFileName = finalFileName;
            this.updateFileInfo(`Nuevo archivo: ${this.currentFileName} (temporal - usa "Guardar como..." para seleccionar ubicación)`);
            this.enableOperations();
            this.refreshTable();
            this.showAlert(`Nuevo archivo ${this.currentFileName} creado. Usa "Guardar como..." para seleccionar dónde guardarlo.`, 'success');
        }
    }
 
    async saveFile() {
        if (!this.currentFileName) {
            this.showAlert('No hay archivo para guardar. Usa "Guardar como..." primero.', 'error');
            return;
        }
 
        if (this.data.length === 0) {
            this.showAlert('No hay datos para guardar.', 'error');
            return;
        }
 
        const dataStr = JSON.stringify(this.data, null, 2);
       
        // Intentar usar la API de File System Access si está disponible
        if ('showSaveFilePicker' in window) {
            try {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: this.currentFileName,
                    types: [{
                        description: 'Archivos JSON',
                        accept: { 'application/json': ['.json'] }
                    }]
                });
 
                const writable = await fileHandle.createWritable();
                await writable.write(dataStr);
                await writable.close();
 
                this.currentFileName = fileHandle.name;
                this.updateFileInfo(`Archivo guardado: ${this.currentFileName}`);
                this.showAlert(`Archivo ${this.currentFileName} guardado correctamente en la ubicación seleccionada.`, 'success');
                return;
            } catch (error) {
                if (error.name === 'AbortError') {
                    return; // Usuario canceló
                }
                console.error('Error al guardar archivo:', error);
                this.showAlert('Error al usar el selector de archivos. Usando método de descarga.', 'warning');
            }
        }

        // Fallback para navegadores que no soportan File System Access API
        this.saveFileTraditional(dataStr, this.currentFileName);
    }

    async saveAsFile() {
        if (this.data.length === 0) {
            this.showAlert('No hay datos para guardar.', 'error');
            return;
        }

        // Determinar nombre por defecto
        let defaultName = 'Nombre';
        if (this.currentFileName) {
            defaultName = this.currentFileName.replace('.json', '');
        }
 
        const dataStr = JSON.stringify(this.data, null, 2);

        // Intentar usar la API de File System Access si está disponible
        if ('showSaveFilePicker' in window) {
            try {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: `${defaultName}.json`,
                    types: [{
                        description: 'Archivos JSON',
                        accept: { 'application/json': ['.json'] }
                    }]
                });
 
                const writable = await fileHandle.createWritable();
                await writable.write(dataStr);
                await writable.close();
 
                this.currentFileName = fileHandle.name;
                this.updateFileInfo(`Archivo guardado: ${this.currentFileName}`);
                this.showAlert(`Archivo ${this.currentFileName} guardado correctamente en la ubicación seleccionada.`, 'success');
                return;
            } catch (error) {
                if (error.name === 'AbortError') {
                    return; // Usuario canceló
                }
                console.error('Error al guardar archivo:', error);
                this.showAlert('Error al usar el selector de archivos. Usando método de descarga.', 'warning');
            }
        } else {
            this.showAlert('Tu navegador no soporta el selector de ubicación. El archivo se descargará a tu carpeta de descargas.', 'info');
        }
 
        // Fallback: pedir nombre y descargar
        const fileName = prompt('Introduce el nombre del archivo (sin extensión):', defaultName);
        if (fileName && fileName.trim()) {
            const finalFileName = fileName.trim().endsWith('.json') ? fileName.trim() : `${fileName.trim()}.json`;
            this.saveFileTraditional(dataStr, finalFileName);
        }
    }
 
    saveFileTraditional(dataStr, fileName) {
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
       
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = fileName;
        link.click();
       
        this.currentFileName = fileName;
        this.updateFileInfo(`Archivo descargado: ${this.currentFileName}`);
        this.showAlert(`Archivo ${this.currentFileName} descargado a tu carpeta de descargas.`, 'success');
    }
 
    updateFileInfo(message) {
        const fileInfo = document.getElementById('fileInfo');
        fileInfo.textContent = message;
        fileInfo.style.display = 'block';
       
        // Habilitar botón de guardar
        document.getElementById('saveFileBtn').disabled = false;
        document.getElementById('saveAsBtn').disabled = false;
        document.getElementById('exportCsvBtn').disabled = false;
    }
 
    enableOperations() {
        document.getElementById('addBtn').disabled = false;
        document.getElementById('modifyBtn').disabled = false;
        document.getElementById('deleteBtn').disabled = false;
        document.getElementById('searchBtn').disabled = false;
    }
 
    // Gestión de formularios
    showAddForm() {
        this.isEditing = false;
        this.editingIndex = -1;
        document.getElementById('formTitle').textContent = 'Añadir Registro';
        document.getElementById('formPanel').style.display = 'block';
        this.clearForm();
       
        // Restablecer todos los campos como editables para añadir
        document.getElementById('jornada').disabled = false;
        document.getElementById('fecha').readOnly = false;
        document.getElementById('ubicacion').readOnly = false;
        document.getElementById('arbitro').readOnly = false;
        document.getElementById('estado').disabled = false;
        document.getElementById('resultado').readOnly = false;
        document.getElementById('descripcion').readOnly = false;
       
        // Restablecer estilos normales
        document.getElementById('jornada').style.backgroundColor = '';
        document.getElementById('fecha').style.backgroundColor = '';
        document.getElementById('ubicacion').style.backgroundColor = '';
        document.getElementById('arbitro').style.backgroundColor = '';
        document.getElementById('estado').style.backgroundColor = '';
        document.getElementById('resultado').style.backgroundColor = '';
        document.getElementById('descripcion').style.backgroundColor = '';
       
        // Enfocar primer campo
        document.getElementById('jornada').focus();
    }
 
    showModifySearch() {
        document.getElementById('modifySearchPanel').style.display = 'block';
        document.getElementById('modifyEstadoValue').focus();
    }
 
    showDeleteSearch() {
        document.getElementById('deleteSearchPanel').style.display = 'block';
        document.getElementById('deleteJornadaValue').focus();
    }
 
    showSearchPanel() {
        document.getElementById('searchPanel').style.display = 'block';
        document.getElementById('searchValue').focus();
    }
 
    hideFormPanel() {
        document.getElementById('formPanel').style.display = 'none';
        this.clearForm();
       
        // Restablecer todos los campos a su estado normal
        document.getElementById('jornada').disabled = false;
        document.getElementById('fecha').readOnly = false;
        document.getElementById('ubicacion').readOnly = false;
        document.getElementById('arbitro').readOnly = false;
        document.getElementById('estado').disabled = false;
        document.getElementById('resultado').readOnly = false;
        document.getElementById('descripcion').readOnly = false;
       
        // Limpiar estilos
        document.getElementById('jornada').style.backgroundColor = '';
        document.getElementById('fecha').style.backgroundColor = '';
        document.getElementById('ubicacion').style.backgroundColor = '';
        document.getElementById('arbitro').style.backgroundColor = '';
        document.getElementById('estado').style.backgroundColor = '';
        document.getElementById('resultado').style.backgroundColor = '';
        document.getElementById('descripcion').style.backgroundColor = '';
    }
 
    hideSearchPanel() {
        document.getElementById('searchPanel').style.display = 'none';
    }
 
    hideModifySearchPanel() {
        document.getElementById('modifySearchPanel').style.display = 'none';
        document.getElementById('modifyEstadoValue').value = '';
    }
 
    hideDeleteSearchPanel() {
        document.getElementById('deleteSearchPanel').style.display = 'none';
        document.getElementById('deleteJornadaValue').value = '';
    }
 
    clearForm() {
        document.getElementById('recordForm').reset();
    }
 
    handleFormSubmit(event) {
        event.preventDefault();
       
        const formData = new FormData(event.target);
        const record = {
            proyecto: formData.get('jornada').trim(),
            fecha: formData.get('fecha'),
            ubicacion: formData.get('ubicacion').trim(),
            arbitro: formData.get('arbitro').trim(),
            estado: formData.get('estado'),
            resultado: formData.get('resultado').trim(),
            descripcion: formData.get('descripcion').trim()
        };
 
        if (this.isEditing) {
            // En modo edición, solo validar los campos editables (estado, resultado y descripción)
            if (!record.estado || !record.descripcion) {
                this.showAlert('Estado y Descripción son obligatorios.', 'error');
                return;
            }
           
            // Mantener los datos originales para campos no editables
            const originalRecord = this.data[this.editingIndex];
            record.proyecto = originalRecord.proyecto;
            record.fecha = originalRecord.fecha;
            record.ubicacion = originalRecord.ubicacion;
            record.arbitro = originalRecord.arbitro;
           
            this.data[this.editingIndex] = record;
            this.markUnsavedChanges();
            this.showAlert('Registro modificado correctamente. Solo se han actualizado Estado, Resultado y Descripción.', 'success');
        } else {
            // En modo añadir, validar campos obligatorios
            if (!record.proyecto || !record.fecha || !record.ubicacion || !record.arbitro || !record.estado || !record.descripcion) {
                this.showAlert('Todos los campos son obligatorios excepto Resultado.', 'error');
                return;
            }
           
            // Añadir nuevo registro
            this.data.push(record);
            this.markUnsavedChanges();
            this.showAlert('Registro añadido correctamente.', 'success');
        }
 
        this.hideFormPanel();
        this.refreshTable();
    }
 
    // Búsquedas
    executeSearch() {
        const field = document.getElementById('searchField').value;
        const value = document.getElementById('searchValue').value.toLowerCase().trim();
 
        // Si no hay valor de búsqueda, mostrar todos los datos
        if (!value) {
            this.filteredData = [...this.data];
        } else {
            // Asegurar que this.data es un array válido
            if (!Array.isArray(this.data)) {
                this.filteredData = [];
            } else {
                this.filteredData = this.data.filter(record => {
                    // Validar que el registro existe y tiene propiedades
                    if (!record || typeof record !== 'object') {
                        return false;
                    }
 
                    if (field === 'all') {
                        return Object.values(record).some(val => {
                            if (val === null || val === undefined) return false;
                            return val.toString().toLowerCase().includes(value);
                        });
                    } else {
                        const fieldValue = record[field];
                        if (fieldValue === null || fieldValue === undefined) return false;
                        return fieldValue.toString().toLowerCase().includes(value);
                    }
                });
            }
        }
 
        this.currentPage = 1;
        this.refreshTable();
    }
 
    clearSearch() {
        document.getElementById('searchField').value = 'all';
        document.getElementById('searchValue').value = '';
        this.filteredData = [...this.data];
        this.currentPage = 1;
        this.refreshTable();
    }
 
    executeModifySearch() {
        const estadoValue = document.getElementById('modifyEstadoValue').value.trim();
        if (!estadoValue) {
            this.showAlert('Selecciona un estado.', 'error');
            return;
        }
 
        const matchingRecords = this.data.filter(record => record.estado === estadoValue);
        if (matchingRecords.length === 0) {
            this.showAlert('No se encontró ningún registro con ese estado.', 'error');
            return;
        }
 
        if (matchingRecords.length > 1) {
            this.showAlert(`Se encontraron ${matchingRecords.length} registros con ese estado. Usa la búsqueda general para seleccionar uno específico.`, 'info');
            return;
        }
 
        // Si solo hay un registro, editarlo
        const index = this.data.findIndex(record => record.estado === estadoValue);
        this.isEditing = true;
        this.editingIndex = index;
        const record = this.data[index];
       
        document.getElementById('formTitle').textContent = 'Modificar Registro';
       
        // Cargar todos los datos
        document.getElementById('jornada').value = record.proyecto;
        document.getElementById('fecha').value = record.fecha || '';
        document.getElementById('ubicacion').value = record.ubicacion || '';
        document.getElementById('arbitro').value = record.arbitro || '';
        document.getElementById('estado').value = record.estado;
        document.getElementById('resultado').value = record.resultado || '';
        document.getElementById('descripcion').value = record.descripcion;
 
        // Configurar campos como solo lectura (excepto estado, resultado y descripción)
        document.getElementById('jornada').disabled = true;
        document.getElementById('fecha').readOnly = true;
        document.getElementById('ubicacion').readOnly = true;
        document.getElementById('arbitro').readOnly = true;
       
        // Asegurar que estado, resultado y descripción sean editables
        document.getElementById('estado').disabled = false;
        document.getElementById('resultado').readOnly = false;
        document.getElementById('descripcion').readOnly = false;
 
        // Añadir estilos visuales para campos no editables
        document.getElementById('jornada').style.backgroundColor = '#f8f9fa';
        document.getElementById('fecha').style.backgroundColor = '#f8f9fa';
        document.getElementById('ubicacion').style.backgroundColor = '#f8f9fa';
        document.getElementById('arbitro').style.backgroundColor = '#f8f9fa';
       
        // Resaltar campos editables
        document.getElementById('estado').style.backgroundColor = '#fff';
        document.getElementById('resultado').style.backgroundColor = '#fff';
        document.getElementById('descripcion').style.backgroundColor = '#fff';
 
        this.hideModifySearchPanel();
        document.getElementById('formPanel').style.display = 'block';
       
        // Enfocar el primer campo editable (estado)
        document.getElementById('estado').focus();
    }
 
    executeDeleteSearch() {
        const jornadaValue = document.getElementById('deleteJornadaValue').value.trim();
        if (!jornadaValue) {
            this.showAlert('Selecciona una jornada.', 'error');
            return;
        }
 
        const matchingRecords = this.data.filter(record => record.proyecto === jornadaValue);
        if (matchingRecords.length === 0) {
            this.showAlert('No se encontró ningún registro con esa jornada.', 'error');
            return;
        }
 
        if (matchingRecords.length > 1) {
            this.showAlert(`Se encontraron ${matchingRecords.length} registros con esa jornada. Usa la búsqueda general para seleccionar uno específico.`, 'info');
            return;
        }
 
        // Si solo hay un registro, confirmarlo para borrar
        const index = this.data.findIndex(record => record.proyecto === jornadaValue);
        const record = this.data[index];
       
        // Mostrar confirmación
        this.showConfirmModal(
            `¿Estás seguro de que quieres borrar el registro de la jornada "${jornadaValue}"?`,
            () => {
                this.data.splice(index, 1);
                this.hideDeleteSearchPanel();
                this.markUnsavedChanges();
                this.refreshTable();
                this.showAlert('Registro borrado correctamente.', 'success');
            }
        );
    }
 
    // Gestión de tabla
    refreshTable() {
        const tableBody = document.getElementById('tableBody');
        const noDataMessage = document.getElementById('noDataMessage');
       
        // Usar datos filtrados si existe búsqueda activa
        const hasActiveSearch = document.getElementById('searchValue').value.trim() !== '';
        let dataToShow = hasActiveSearch ? this.filteredData : this.data;
 
        // Asegurar que dataToShow es un array válido
        if (!Array.isArray(dataToShow)) {
            dataToShow = [];
        }
 
        // Ordenar datos
        dataToShow = this.sortData([...dataToShow]);
 
        if (dataToShow.length === 0) {
            tableBody.innerHTML = '';
            if (this.data.length === 0) {
                noDataMessage.style.display = 'block';
                noDataMessage.innerHTML = '<p>No hay datos para mostrar. Carga un archivo JSON o crea uno nuevo.</p>';
            } else {
                noDataMessage.style.display = 'block';
                noDataMessage.innerHTML = '<p>No se encontraron registros que coincidan con la búsqueda.</p>';
            }
            document.querySelector('.table-container').style.display = 'none';
            this.updatePagination(0, 0);
            return;
        }
 
        noDataMessage.style.display = 'none';
        document.querySelector('.table-container').style.display = 'block';
 
        // Calcular datos para la página actual
        const startIndex = (this.currentPage - 1) * this.recordsPerPage;
        const endIndex = startIndex + this.recordsPerPage;
        const pageData = dataToShow.slice(startIndex, endIndex);
 
        // Generar filas de la tabla
        tableBody.innerHTML = pageData.map(record => {
            // Validar que el registro tiene todos los campos necesarios
            const proyecto = record.proyecto || '';
            const fecha = record.fecha || '';
            const ubicacion = record.ubicacion || '';
            const arbitro = record.arbitro || '';
            const estado = record.estado || '';
            const resultado = record.resultado || '';
            const descripcion = record.descripcion || '';
 
            return `
                <tr>
                    <td>${this.escapeHtml(proyecto)}</td>
                    <td>${this.escapeHtml(fecha)}</td>
                    <td>${this.escapeHtml(ubicacion)}</td>
                    <td>${this.escapeHtml(arbitro)}</td>
                    <td>${this.escapeHtml(estado)}</td>
                    <td>${this.escapeHtml(resultado)}</td>
                    <td>${this.escapeHtml(descripcion)}</td>
                </tr>
            `;
        }).join('');
 
        this.updatePagination(dataToShow.length, Math.ceil(dataToShow.length / this.recordsPerPage));
    } 
    updatePagination(totalRecords, totalPages) {
        const pageInfo = document.getElementById('pageInfo');
        const prevBtn = document.getElementById('prevPageBtn');
        const nextBtn = document.getElementById('nextPageBtn');
 
        if (totalPages <= 1) {
            pageInfo.textContent = totalRecords > 0 ? `${totalRecords} registro${totalRecords !== 1 ? 's' : ''}` : '';
            prevBtn.disabled = true;
            nextBtn.disabled = true;
        } else {
            pageInfo.textContent = `Página ${this.currentPage} de ${totalPages} (${totalRecords} registros)`;
            prevBtn.disabled = this.currentPage <= 1;
            nextBtn.disabled = this.currentPage >= totalPages;
        }
    }
 
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.refreshTable();
        }
    }
 
    nextPage() {
        const dataToShow = this.filteredData.length > 0 || document.getElementById('searchValue').value ?
                          this.filteredData : this.data;
        const totalPages = Math.ceil(dataToShow.length / this.recordsPerPage);
       
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.refreshTable();
        }
    }
 
    // Utilidades
    formatDateTimeLocal(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
       
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
 
    formatDateTime(dateTimeString) {
        if (!dateTimeString) return '-';
       
        try {
            const date = new Date(dateTimeString);
            return date.toLocaleString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            return dateTimeString;
        }
    }
 
    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        if (typeof text !== 'string') {
            text = String(text);
        }
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
 
    showAlert(message, type = 'info') {
        // Crear elemento de alerta
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            animation: slideInAlert 0.3s ease-out;
        `;
 
        // Colores según el tipo
        switch (type) {
            case 'success':
                alert.style.background = 'linear-gradient(45deg, #27ae60, #2ecc71)';
                break;
            case 'error':
                alert.style.background = 'linear-gradient(45deg, #e74c3c, #c0392b)';
                break;
            default:
                alert.style.background = 'linear-gradient(45deg, #3498db, #2980b9)';
        }
 
        alert.textContent = message;
        document.body.appendChild(alert);
 
        // Agregar animación CSS si no existe
        if (!document.getElementById('alertStyles')) {
            const style = document.createElement('style');
            style.id = 'alertStyles';
            style.textContent = `
                @keyframes slideInAlert {
                    from {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
                @keyframes slideOutAlert {
                    from {
                        opacity: 1;
                        transform: translateX(0);
                    }
                    to {
                        opacity: 0;
                        transform: translateX(100%);
                    }
                }
            `;
            document.head.appendChild(style);
        }
 
        // Eliminar después de 4 segundos
        setTimeout(() => {
            alert.style.animation = 'slideOutAlert 0.3s ease-out';
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.parentNode.removeChild(alert);
                }
            }, 300);
        }, 4000);
    }
 
    showConfirmModal(message, onConfirm) {
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmModal').style.display = 'flex';
       
        // Guardar la función de confirmación
        this._pendingConfirmAction = onConfirm;
    }
 
    hideConfirmModal() {
        document.getElementById('confirmModal').style.display = 'none';
        this._pendingConfirmAction = null;
    }
 
    confirmAction() {
        if (this._pendingConfirmAction) {
            this._pendingConfirmAction();
            this._pendingConfirmAction = null;
        }
        this.hideConfirmModal();
    }
 
    // Verificar compatibilidad del navegador
    checkBrowserCompatibility() {
        if ('showSaveFilePicker' in window) {
            console.log('✅ Navegador compatible con File System Access API');
        } else {
            console.log('ℹ️ Navegador no compatible con File System Access API - usando fallback');
        }
    }
 
    // Inicializar atajos de teclado
    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // No ejecutar atajos si estamos escribiendo en un input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
                return;
            }
 
            if (e.ctrlKey || e.metaKey) {
                switch (e.key.toLowerCase()) {
                    case 'n':
                        e.preventDefault();
                        this.createNewFile();
                        break;
                    case 'o':
                        e.preventDefault();
                        document.getElementById('fileInput').click();
                        break;
                    case 's':
                        e.preventDefault();
                        if (e.shiftKey) {
                            this.saveAsFile();
                        } else {
                            this.saveFile();
                        }
                        break;
                    case 'a':
                        e.preventDefault();
                        if (!document.getElementById('addBtn').disabled) {
                            this.showAddForm();
                        }
                        break;
                    case 'm':
                        e.preventDefault();
                        if (!document.getElementById('modifyBtn').disabled) {
                            this.showModifySearch();
                        }
                        break;
                    case 'd':
                        e.preventDefault();
                        if (!document.getElementById('deleteBtn').disabled) {
                            this.showDeleteSearch();
                        }
                        break;
                    case 'f':
                        e.preventDefault();
                        if (!document.getElementById('searchBtn').disabled) {
                            this.showSearchPanel();
                        }
                        break;
                    case 't':
                        e.preventDefault();
                        this.toggleTheme();
                        break;
                   


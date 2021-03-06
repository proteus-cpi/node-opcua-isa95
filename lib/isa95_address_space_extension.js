const assert = require("assert");
const path = require("path");
const _ = require("underscore");
const semver = require("semver");
const lowerFirstLetter = require("node-opcua-utils").lowerFirstLetter;

const expected_version = "0.5.1";

exports.install = function(opcua) {

    if (opcua.hasOwnProperty("ISA95")){
        return false; // already installed
    }

    // verify that node-opcua version is compatible
    if (semver.lt(opcua.version, expected_version)) {
        throw new Error("node-opcua-isa95 need node-opcua version to be greater" +
            " or equal than " + expected_version + ". Currently your version of node-opcua is " + opcua.version+ "" +
            " Please update node-opcua");
    }

    if (semver.gt(opcua.version, expected_version)) {
        console.log("warning : the expected version of node-opcua is less than " + expected_version + " - actual version is " + opcua.version);
        console.log("Please, check if there is a newer version of node-opcua-isa95!")
    }

    const Enum = opcua.Enum;//require("enum");

    const EquipmentLevel = new Enum({
        // ISA95EquipmentElementLevelEnum
        //
        // This DataType is an enumeration that defines the equipment element levels defined in ISA-95. Its values are
        // defined in a below table.
        // Note:  for enumeration DataTypes it is recommended that variables that use the enumeration also expose the EnumStrings
        //        property. This property allows a client to easily translate the enumeration (integer value) to a string for
        //        display (see OPC Part 3).
        // Table 36 – ISA95EquipmentElementLevelEnum Values
        //
        // Value              Description
        // ENTERPRISE_0       An enterprise is a collection of sites and areas and represents the top level of a role based
        //                    equipment hierarchy.
        Enterprise: 0,

        // SITE_1             A site is a physical, geographical, or logical grouping determined by the enterprise. It may contain
        //                    areas, production lines, process cells, and production units.
        Site: 1,

        // AREA_2             An area is a physical, geographical, or logical grouping determined by the site. It may contain work
        //                    centres such as process cells, production units, production lines, and storage zones.
        Area: 2,

        // PROCESSCELL_3      Process cells are the low level of equipment typically scheduled by the Level 4 and Level 3
        //                    functions for batch manufacturing processes. The definitions for process cells are
        //                    contained in IEC 61512-1.
        ProcessCell: 3,

        // UNIT_4             Units are low level of equipment typically scheduled by the Level 4 and Level 3 functions for batch
        //                    manufacturing processes and continuous manufacturing processes. The definition of the unit for batch
        //                    manufacturing processes is contained in IEC 61512-1.
        Unit: 4,

        // PRODUCTIONLINE_5   Production lines are low levels of equipment typically scheduled by the Level 4 or Level 3
        //                    functions for discrete manufacturing processes.
        ProductionLine: 5,

        // WORKCELL_6         Work cells are low levels of equipment typically scheduled by the Level 4 or Level 3 functions for
        //                    discrete manufacturing processes.
        WorkCell: 6,

        // PRODUCTIONUINT_7   Production units are the lowest level of equipment typically scheduled by the Level 4 or Level
        //                    functions for continuous manufacturing processes.
        ProductionUnit: 7,

        // STORAGEZONE_8      Storage zones are low level of material movement equipment typically scheduled by the Level 4 and
        //                    Level 3 functions for discrete, batch and continuous manufacturing processes.
        StorageZone: 8,

        // STORAGEUNIT_9      Storage units are low level of material movement equipment typically scheduled by the  Level 4 and
        //                    Level 3 functions for discrete, batch and continuous manufacturing processes.
        //                    WORKCENTER_10 Work centres are typically the grouping of equipment scheduled by the Level 4 or
        //                    Level 3 functions.
        StorageUnit: 9,
        // WORKUNIT_11        A work unit is any element of the equipment hierarchy under a work centre. Work units are the lowest
        //                    form of elements in an equipment hierarchy that are typically scheduled by Level 3 functions.
        WorkUnit: 11,

        // EQUIPMENTMODULE_12 An equipment module entity is an engineered subdivision of a process cell, a unit, or another
        //                    equipment module. The definition of the equipment module is contained in IEC61512-1.
        EquipmentModule: 12,

        // CONTROLMODULE_13   A control module entity is an engineered subdivision of a process cell, a unit, an equipment module,
        //                    or another control module. The definition of the equipment module is contained in IEC 61512-1.
        ControlModule: 13,
        // OTHER_14           The types of work centres may be extended when required for application specific role based
        //                    equipment hierarchies where the defined types do not apply. In that case, the equipment element
        //                    level shall be specified as this value, and actual value that identifies the level shall be
        //                    specified by OtherValue Property of ISAHierarchyScopeType defined in 7.4.1.
        Other: 14
        // When a new type is added it shall maintain the same relationship within the hierarchy as the defined work centre
        // types (within an area and contains work units).
    });

    const registerBasicType = require("node-opcua-factory").registerBasicType;
    registerBasicType({ name: "CDTIdentifier",  subtype: "String",  defaultValue: null});

    assert(!opcua.hasOwnProperty('ISA95'),"already initialized ?");

    opcua.ISA95= {};
    opcua.ISA95.EquipmentLevel = EquipmentLevel;

    const isa95_xml_file = path.join(__dirname, "../nodesets/Opc.ISA95.NodeSet2.xml");
    opcua.ISA95.nodeset_file = isa95_xml_file;

    function coerceISA95TypeDefinition(addressSpace,typeDefinition,baseType) {

        baseType = addressSpace.findISA95VariableType(baseType);
        assert(baseType,baseType + " must exists ");
        if (typeof typeDefinition === "string") {
            const _typeDefinition = addressSpace.findISA95VariableType(typeDefinition);
            assert(_typeDefinition,typeDefinition + " must exists ");
            typeDefinition = _typeDefinition;
        }
        if (typeDefinition instanceof opcua.NodeId) {
            typeDefinition = addressSpace.findNode(typeDefinition);
        }
        assert(typeDefinition.nodeId instanceof opcua.NodeId);

        // istanbul ignore next
        if (!baseType.isSupertypeOf(typeDefinition)) {
            //xx throw new Error(typeDefinition.browseName.toString() + " must be a subtype of " + baseType.browseName.toString());
        }
        return typeDefinition;
    }

    /**
     *
     * @param options
     * @param options.browseName
     * @param options.ISA95ClassPropertyOf
     * @param options.typeDefinition
     * @param options.dataType
     * @param options.value
     */
    opcua.AddressSpace.prototype.addISA95ClassProperty = function(options) {

        assert(options.dataType,"expecting a dataType here");
        assert(!options.componentOf && !options.organizedBy && !options.propertyOf);
        assert(options.typeDefinition, "expecting a typeDefinition");
        assert(options.ISA95ClassPropertyOf,"expecting a parent object");
        // todo ; check that nodeISA95 is a ...ClassType
        const nodeISA95 = options.ISA95ClassPropertyOf;
        const addressSpace = nodeISA95.addressSpace;
        const namespace = addressSpace.getOwnNamespace();
    
        function coerceISA95ClassPropertyTypeDefinition(typeDefinition) {
            return coerceISA95TypeDefinition(addressSpace,typeDefinition,"ISA95ClassPropertyType");
        }
        const typeDefinition = coerceISA95ClassPropertyTypeDefinition(options.typeDefinition);

        const ns = addressSpace.getISA95Namespace();


        // placeHolder  => HasISA95ClassProperty => <PropertyName>
        //              => TestedByEquipmentTest => <TestSpecification>
        //
        const property = namespace.addVariable({
            typeDefinition: typeDefinition,
            browseName: options.browseName,
            dataType: options.dataType,
            value: options.value
        });

        // not : the hasISA95ClassProperty reference will be turned into a  hasISA95Property in the instantiated object
        const hasISA95ClassProperty = addressSpace.findReferenceType("HasISA95ClassProperty",ns);

        nodeISA95.addReference({
            referenceType: hasISA95ClassProperty.nodeId,
                nodeId: property
        });
        return property;
    };

    /**
     *
     * @param options
     * @param options.browseName
     * @param options.typeDefinition
     * @param options.ISA95PropertyOf
     * @param [options.modellingRule]
     * @returns {UAVariable}
     */
    opcua.AddressSpace.prototype.addISA95Property = function(options) {

        assert(options.browseName,"expecting a browseName");
        assert(options.dataType,"expecting a dataType here");
        assert(!options.componentOf && !options.organizedBy && !options.propertyOf);
        assert(options.typeDefinition, "expecting a typeDefinition");
        assert(options.ISA95PropertyOf,"expecting a parent object");

        // todo ; check that nodeISA95 is a ...ClassType
        const nodeISA95 = options.ISA95PropertyOf;
        const addressSpace = nodeISA95.addressSpace;
        const namespace = addressSpace.getOwnNamespace();
    
        const ns = addressSpace.getISA95Namespace();
        const hasISA95Property = addressSpace.findReferenceType("HasISA95Property",ns);

        function coerceISA95PropertyTypeDefinition(typeDefinition) {
            return coerceISA95TypeDefinition(addressSpace,typeDefinition,"ISA95PropertyType");
        }
        const typeDefinition = coerceISA95PropertyTypeDefinition(options.typeDefinition);

        const property = namespace.addVariable({
            browseName: options.browseName,
            typeDefinition: typeDefinition,
            modellingRule: options.modellingRule,
            dataType: options.dataType,
            value: options.value

        });
        nodeISA95.addReference({
            referenceType: hasISA95Property.nodeId,
            nodeId: property
        });
        return property;

    };

    /**
     *
     * @param options
     * @param options.browseName
     * @param options.dataType
     * @param options.value
     * @param [options.typeDefinition]
     * @param [options.modellingRule]
     * @param options.ISA95AttributeOf
     */
    opcua.AddressSpace.prototype.addISA95Attribute = function(options) {

        assert(options.ISA95AttributeOf," ISA95AttributeOf options is expected");
        const nodeISA95 = options.ISA95AttributeOf;

        // modelling rule must be specified if nodeISA95 is a UAVariableType of UAObjectType;
        if (!options.modellingRule &&
            ( nodeISA95.constructor.name === "UAVariableType" ||
              nodeISA95.constructor.name === "UAObjectType")) {
            throw new Error("Expecting options.modellingRule to be specified")
        }
        const addressSpace = nodeISA95.addressSpace;
        const namespace = addressSpace.getOwnNamespace();
    
        const ns = addressSpace.getNamespaceIndex("http://www.OPCFoundation.org/UA/2013/01/ISA95");

        const hasISA95Attribute = addressSpace.findReferenceType("HasISA95Attribute",ns);

        let dataType =  options.dataType;
        if (typeof dataType === "string") {
            let dataTypeNode = addressSpace.findDataType(dataType,ns);
            if (!dataTypeNode) {
                dataTypeNode = addressSpace.findDataType(dataType);
                if (!dataTypeNode) {
                    dataTypeNode = opcua.DataType[dataType];
                }
            }
            dataType = dataTypeNode;
        }
        if(!dataType ){
            console.log("opcua.",opcua.DataType);
            throw new Error(" cannot find dataType " + options.dataType + " " + typeof options.dataType );
        }

        const typeDefinition = options.typeDefinition || addressSpace.findVariableType("BaseDataVariableType");

        const property = namespace.addVariable({
            typeDefinition: typeDefinition,
            modellingRule: options.modellingRule,
            browseName: options.browseName,
            dataType: dataType,
            value: options.value,
        });
        nodeISA95.addReference({
            referenceType: hasISA95Attribute.nodeId,
            nodeId: property
        });

        const name = lowerFirstLetter(property.browseName.name.toString());
        nodeISA95[name] = property;

        return property;
    };

    /**
     * find a ReferenceType in the ISA95 namespace
     * @param name {String}
     * @return {opcua.ReferenceType}
     */
    opcua.AddressSpace.prototype.getISA95Namespace = function() {
        const addressSpace  = this;
        return addressSpace.getNamespaceIndex("http://www.OPCFoundation.org/UA/2013/01/ISA95");
    };

    opcua.AddressSpace.prototype.findISA95ReferenceType = function(name) {
        const addressSpace  = this;
        return addressSpace.findReferenceType(name,addressSpace.getISA95Namespace());
    };

    opcua.AddressSpace.prototype.findISA95ObjectType = function(name) {
        const addressSpace  = this;
        return addressSpace.findObjectType(name,addressSpace.getISA95Namespace());
    };

    opcua.AddressSpace.prototype.findISA95VariableType = function(name) {
        const addressSpace  = this;
        return addressSpace.findVariableType(name,addressSpace.getISA95Namespace());
    };

    opcua.AddressSpace.prototype.findISA95DataType = function(name) {
        const addressSpace  = this;
        return addressSpace.findDataType(name,addressSpace.getISA95Namespace());
    };

    require("./isa95_address_space_extension_utils")(opcua);
    require("./isa95_address_space_extension_equipment")(opcua);
    require("./isa95_address_space_extension_physical_asset")(opcua);
};

/**
 * Recurisevly create children assembly based on BOM
 * @param {org.company.healthcare.GenerateBOM} generateBOM - create BOM
 * @transaction
 */
function createBOM(generateBOM) {

    var parentassembly = generateBOM.parentAssembly

    parentassembly.childAssembly = []
    recurChild(parentassembly, 0)

    return true
}

async function recurChild(parent_assembly, no) {
    let part = parent_assembly.part 
    console.log(parent_assembly)
    console.log(part.partNo)
    console.log(part.childPart)
    console.log(part)
    if (!(part.childPart) || part.childPart.length === 0) {
        console.log("Exit Recur")
        console.log(part)
        return
    }
   
    const factory = getFactory();
    const NS = 'org.company.healthcare';

    for(let i in part.childPart){
        // create the Child
        let as_id = no + 1
        no++
        let uid = parent_assembly.uid + part.childPart[i].partNo + as_id
        const assembly = factory.newResource(NS, 'Assembly', uid);
        assembly.assemblyQuality = 'Pending';
        if (part.childPart[i].type === 'PROCURED_ITEM') {
            assembly.status = 'TO_BE_PURCHASED';
        } else {
            assembly.status = 'TO_BE_MANUFACTURED';
        }
        assembly.parentAssembly = factory.newRelationship(NS, 'Assembly', parent_assembly.uid);
        assembly.part = factory.newRelationship(NS, 'Part', part.childPart[i].partNo);
        assembly.childAssembly = []
        updateParent(parent_assembly, assembly)
        // add the Child
        const childRegistry = await getAssetRegistry(NS + '.Assembly');
        await childRegistry.addAll([assembly]);
        recurChild(assembly, as_id)
    }
}

function updateParent(parent_assembly, childassem) {
    return getAssetRegistry('org.company.healthcare.Assembly')
        .then(function(assemblyRegistry) {
            // update the receiver's balance
            parent_assembly.childAssembly.push(childassem)
            return assemblyRegistry.update(parent_assembly);
        });
}

function checkadminUser(admin, user) {
    if ((admin) || (user)) {
        return true
    } else {
        throw Error("Provide User or Admin")
    }
}
/**
 * Transaction to procure item
 * @param {org.company.healthcare.Procuring} procuring - Procure assembly
 * @transaction
 */

function procurement(procuring) {

    var procuredassembly = procuring.procuredAssembly

    if (checkadminUser(procuring.procurementAdmin, procuring.procurementUser)) {
        console.log(procuredassembly.part.type)
        if (procuredassembly.part.type == 'PROCURED_ITEM') {
            procuredassembly.status = 'IN_PROCESS'
            return getAssetRegistry('org.company.healthcare.Assembly')
                .then(function(assemblyRegistry) {
                    // update the receiver's balance
                    return assemblyRegistry.update(procuredassembly);
                });
        } else {
            throw Error("Not Procured Item")
        }
    }

}

function getPartFromPartId(partNo) {
    // Get the vehicle asset registry.
    return getAssetRegistry('org.company.healthcare.Part')
        .then(function(partregistry) {
            // Get the specific vehicle from the vehicle asset registry.
            return partregistry.get(partNo);
        })
        .then(function(part) {
            // Process the the vehicle object.
            console.log(part.partNo);
            return part;
        })
}


/**
 * Transaction to manufacture item
 * @param {org.company.healthcare.Manufacturing} manufacturing - Manufacture assembly
 * @transaction
 */

function manufacture(manufacturing) {

    var manufactureassembly = manufacturing.toManufactureAssembly

    if (checkadminUser(manufacturing.manufacturingAdmin, manufacturing.manufacturingUser)) {

        console.log(manufactureassembly.status)
        if (manufactureassembly.status == 'TO_BE_MANUFACTURED') {
            manufactureassembly.childAssembly.map(child => {
                if (child.status != 'PURCHASED' && child.status != 'MANUFACTURED') {
                    throw Error("Child not in correct state")
                }
            })
            manufactureassembly.status = 'IN_PROCESS'
            return getAssetRegistry('org.company.healthcare.Assembly')
                .then(function(assemblyRegistry) {
                    // update the receiver's balance
                    return assemblyRegistry.update(manufactureassembly);
                });
        } else {
            throw Error("Not Manufactured Item")
        }
    }
}

/**
 * Transaction to check quality of item
 * @param {org.company.healthcare.QualityCheck} qualityCheck - Check Quality of Assembly
 * @transaction
 */

function checkQality(qualityCheck) {

    var qualityCheckassembly = qualityCheck.qualityCheckAssembly

    if (qualityCheckassembly.status == 'IN_PROCESS') {

        if (qualityCheckassembly.parentAssembly) {
            if (qualityCheckassembly.part.type == 'MANUFACTURED_ITEM') {
                qualityCheckassembly.status = 'MANUFACTURED'
            } else {
                qualityCheckassembly.status = 'PURCHASED'
            }
        } else {
            qualityCheckassembly.status = 'READY_TO_SHIP'
        }

        qualityCheckassembly.assemblyQuality = 'Completed'
        return getAssetRegistry('org.company.healthcare.Assembly')
            .then(function(assemblyRegistry) {
                // update the receiver's balance
                return assemblyRegistry.update(qualityCheckassembly);
            });

    } else {
        throw Error("Assembly not in process")
    }
}



/**
 * Assemble finished products
 * @param {org.company.healthcare.Assembling} assembling - Assemble finished product
 * @transaction
 */

function assemble(assembling) {

    var assembleassembly = assembling.toAssembleAssembly

    if (checkadminUser(assembling.assemblingAdmin, assembling.assemblingUser)) {
        if (assembleassembly.status == 'TO_BE_ASSEMBLED' && !assembleassembly.parentAssembly) {

            assembleassembly.childAssembly.map(child => {
                if (child.status != 'PURCHASED' && child.status != 'MANUFACTURED') {
                    throw Error("Child not in correct state")
                }
            })

            assembleassembly.status = 'IN_PROCESS'
            return getAssetRegistry('org.company.healthcare.Assembly')
                .then(function(assemblyRegistry) {
                    // update the receiver's balance
                    return assemblyRegistry.update(assembleassembly);
                });
        } else {
            throw Error("Not assembled Item")
        }
    }
}
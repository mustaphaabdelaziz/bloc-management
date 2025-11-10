# User Roles and Permissions System

## Available Roles

### 1. **Admin**
- **Full Access**: Complete access to all functionalities
- **User Management**: Can create, edit, and delete users
- **All Modules**: Access to all system modules
- **No Restrictions**: Can perform any action in the system

### 2. **Medecin (Doctor)**
- **View Only**: Can view only their own surgeries and their share
- **No Edit Permissions**: Cannot edit any data
- **Personal Data**: Access limited to their assigned surgeries
- **Read-Only Access**: View-only permissions across the system

### 3. **Acheteur (Purchaser)**
- **Product Management**: Can create, edit, and delete products/materials
- **Inventory Control**: Full access to material management
- **Limited Scope**: Users with only the `acheteur` privilege are restricted to the materials module in the UI and routes. They cannot create or edit surgeries, patients, users, or other modules. Admins retain override access.
- **Purchasing Focus**: Specialized role for inventory and procurement

### 4. **ChefBloc (Operating Room Manager)**
- **Bloc Activity**: Can view operating room activity and statistics
- **Product Consumption**: Can monitor product usage and consumption
- **Personal Activity**: Can view staff activity and schedules
- **Surgery Management**: Can create, edit, and delete surgeries
- **Limited Editing**: Cannot edit other data outside surgeries

## Middleware Functions

The system includes the following middleware functions for access control:

- `isLoggedIn`: Ensures user is authenticated
- `isAdmin`: Requires admin privileges
- `isMedecin`: Allows admin or medecin access
- `isAcheteur`: Allows admin or acheteur access
- `isChefBloc`: Allows admin or chefBloc access
- `canViewSurgery`: Controls surgery viewing permissions
- `canModifySurgery`: Controls surgery modification (admin + chefBloc only)
- `canModifyMaterial`: Controls material modification (admin + acheteur only)

## Seeded Users

The system comes with pre-configured test users:

1. **Admin User**
   - Email: `admin`
   - Password: `test`
   - Role: `admin`

2. **Doctor**
   - Email: `medecin@example.com`
   - Password: `medecin123`
   - Role: `medecin`

3. **Purchaser**
   - Email: `acheteur@example.com`
   - Password: `acheteur123`
   - Role: `acheteur`

4. **Operating Room Manager**
   - Email: `chefbloc@example.com`
   - Password: `chefbloc123`
   - Role: `chefBloc`

## Implementation Notes

- Admin users have override access to all functions
- Role-based access is enforced at the middleware level
- UI elements are conditionally displayed based on user roles
- Database queries are filtered based on user permissions where applicable
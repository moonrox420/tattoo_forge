( function () {

	/**
 * You can use this geometry to create a decal mesh, that serves different kinds of purposes.
 * e.g. adding unique details to models, performing dynamic visual environmental changes or covering seams.
 *
 * Constructor parameter:
 *
 * mesh — Any mesh object
 * position — Position of the decal projector
 * orientation — Orientation of the decal projector
 * size — Size of the decal projector
 *
 * reference: http://blog.wolfire.com/2009/06/how-to-project-decals/
 *
 */

	class DecalGeometry extends THREE.BufferGeometry {

		constructor( mesh, position, orientation, size, normalCutoff = -0.08 ) {

			super(); // buffers

			const vertices = [];
			const normals = [];
			const uvs = []; // helpers

			const plane = new THREE.Vector3(); // this matrix represents the transformation of the decal projector

			const projectorMatrix = new THREE.Matrix4();
			projectorMatrix.makeRotationFromEuler( orientation );
			projectorMatrix.setPosition( position );
			const projectorMatrixInverse = new THREE.Matrix4();
			projectorMatrixInverse.copy( projectorMatrix ).invert(); // generate buffers

			generate(); // build geometry

			this.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
			this.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );
			this.setAttribute( 'uv', new THREE.Float32BufferAttribute( uvs, 2 ) );

			function generate() {

				let decalVertices = [];
				const vertex0 = new THREE.Vector3();
				const vertex1 = new THREE.Vector3();
				const vertex2 = new THREE.Vector3();
				const normal0 = new THREE.Vector3();
				const normal1 = new THREE.Vector3();
				const normal2 = new THREE.Vector3();
				const pNormal0 = new THREE.Vector3();
				const pNormal1 = new THREE.Vector3();
				const pNormal2 = new THREE.Vector3();

				if ( mesh.geometry.isGeometry === true ) {

					console.error( 'THREE.DecalGeometry no longer supports THREE.Geometry. Use THREE.BufferGeometry instead.' );
					return;

				}

				const geometry = mesh.geometry;
				const positionAttribute = geometry.attributes.position;
				const normalAttribute = geometry.attributes.normal;
				const hasNormals = normalAttribute !== undefined && normalAttribute !== null;

				// first, create an array of 'DecalVertex' objects
				// three consecutive 'DecalVertex' objects represent a single face
				//
				// this data structure will be later used to perform the clipping

				if ( geometry.index !== null ) {

					// indexed THREE.BufferGeometry
					const index = geometry.index;

					for ( let i = 0; i < index.count; i += 3 ) {

						const i0 = index.getX( i );
						const i1 = index.getX( i + 1 );
						const i2 = index.getX( i + 2 );

						vertex0.fromBufferAttribute( positionAttribute, i0 );
						vertex1.fromBufferAttribute( positionAttribute, i1 );
						vertex2.fromBufferAttribute( positionAttribute, i2 );

						if ( hasNormals ) {

							normal0.fromBufferAttribute( normalAttribute, i0 );
							normal1.fromBufferAttribute( normalAttribute, i1 );
							normal2.fromBufferAttribute( normalAttribute, i2 );

							// Evaluate average normal orientation in projector space to cull backside faces
							pNormal0.copy( normal0 ).transformDirection( mesh.matrixWorld ).transformDirection( projectorMatrixInverse );
							pNormal1.copy( normal1 ).transformDirection( mesh.matrixWorld ).transformDirection( projectorMatrixInverse );
							pNormal2.copy( normal2 ).transformDirection( mesh.matrixWorld ).transformDirection( projectorMatrixInverse );

							const avgNormZ = ( pNormal0.z + pNormal1.z + pNormal2.z ) / 3;
							if ( normalCutoff !== undefined && normalCutoff !== null && avgNormZ < normalCutoff ) {

								continue;

							}

						} else {

							// Compute geometric face normal if mesh lacks vertex normals
							const cb = new THREE.Vector3().subVectors( vertex2, vertex1 );
							const ab = new THREE.Vector3().subVectors( vertex0, vertex1 );
							cb.cross( ab ).normalize();
							normal0.copy( cb );
							normal1.copy( cb );
							normal2.copy( cb );

							pNormal0.copy( cb ).transformDirection( mesh.matrixWorld ).transformDirection( projectorMatrixInverse );
							if ( normalCutoff !== undefined && normalCutoff !== null && pNormal0.z < normalCutoff ) {

								continue;

							}

						}

						pushDecalVertex( decalVertices, vertex0, normal0 );
						pushDecalVertex( decalVertices, vertex1, normal1 );
						pushDecalVertex( decalVertices, vertex2, normal2 );

					}

				} else {

					// non-indexed THREE.BufferGeometry
					for ( let i = 0; i < positionAttribute.count; i += 3 ) {

						vertex0.fromBufferAttribute( positionAttribute, i );
						vertex1.fromBufferAttribute( positionAttribute, i + 1 );
						vertex2.fromBufferAttribute( positionAttribute, i + 2 );

						if ( hasNormals ) {

							normal0.fromBufferAttribute( normalAttribute, i );
							normal1.fromBufferAttribute( normalAttribute, i + 1 );
							normal2.fromBufferAttribute( normalAttribute, i + 2 );

							pNormal0.copy( normal0 ).transformDirection( mesh.matrixWorld ).transformDirection( projectorMatrixInverse );
							pNormal1.copy( normal1 ).transformDirection( mesh.matrixWorld ).transformDirection( projectorMatrixInverse );
							pNormal2.copy( normal2 ).transformDirection( mesh.matrixWorld ).transformDirection( projectorMatrixInverse );

							const avgNormZ = ( pNormal0.z + pNormal1.z + pNormal2.z ) / 3;
							if ( normalCutoff !== undefined && normalCutoff !== null && avgNormZ < normalCutoff ) {

								continue;

							}

						} else {

							const cb = new THREE.Vector3().subVectors( vertex2, vertex1 );
							const ab = new THREE.Vector3().subVectors( vertex0, vertex1 );
							cb.cross( ab ).normalize();
							normal0.copy( cb );
							normal1.copy( cb );
							normal2.copy( cb );

							pNormal0.copy( cb ).transformDirection( mesh.matrixWorld ).transformDirection( projectorMatrixInverse );
							if ( normalCutoff !== undefined && normalCutoff !== null && pNormal0.z < normalCutoff ) {

								continue;

							}

						}

						pushDecalVertex( decalVertices, vertex0, normal0 );
						pushDecalVertex( decalVertices, vertex1, normal1 );
						pushDecalVertex( decalVertices, vertex2, normal2 );

					}

				} // second, clip the geometry so that it doesn't extend out from the projector


				decalVertices = clipGeometry( decalVertices, plane.set( 1, 0, 0 ) );
				decalVertices = clipGeometry( decalVertices, plane.set( - 1, 0, 0 ) );
				decalVertices = clipGeometry( decalVertices, plane.set( 0, 1, 0 ) );
				decalVertices = clipGeometry( decalVertices, plane.set( 0, - 1, 0 ) );
				decalVertices = clipGeometry( decalVertices, plane.set( 0, 0, 1 ) );
				decalVertices = clipGeometry( decalVertices, plane.set( 0, 0, - 1 ) ); // third, generate final vertices, normals and uvs

				for ( let i = 0; i < decalVertices.length; i ++ ) {

					const decalVertex = decalVertices[ i ]; // create texture coordinates (we are still in projector space)

					uvs.push( 0.5 + decalVertex.position.x / size.x, 0.5 + decalVertex.position.y / size.y ); // transform the vertex back to world space

					decalVertex.position.applyMatrix4( projectorMatrix );

					// Subtle normal offset to prevent z-fighting on curved / grazing surfaces
					const offsetNormal = decalVertex.normal.clone().normalize();
					decalVertex.position.addScaledVector( offsetNormal, 0.0015 );

					// now create vertex and normal buffer data
					vertices.push( decalVertex.position.x, decalVertex.position.y, decalVertex.position.z );
					normals.push( decalVertex.normal.x, decalVertex.normal.y, decalVertex.normal.z );

				}

			}

			function pushDecalVertex( decalVertices, vertex, normal ) {

				// transform the vertex to world space, then to projector space
				const v = vertex.clone().applyMatrix4( mesh.matrixWorld ).applyMatrix4( projectorMatrixInverse );
				const n = normal.clone().transformDirection( mesh.matrixWorld );
				decalVertices.push( new DecalVertex( v, n ) );

			}

			function clipGeometry( inVertices, plane ) {

				const outVertices = [];
				const s = 0.5 * Math.abs( size.dot( plane ) ); // a single iteration clips one face,
				// which consists of three consecutive 'DecalVertex' objects

				for ( let i = 0; i < inVertices.length; i += 3 ) {

					let total = 0;
					let nV1;
					let nV2;
					let nV3;
					let nV4;
					const d1 = inVertices[ i + 0 ].position.dot( plane ) - s;
					const d2 = inVertices[ i + 1 ].position.dot( plane ) - s;
					const d3 = inVertices[ i + 2 ].position.dot( plane ) - s;
					const v1Out = d1 > 0;
					const v2Out = d2 > 0;
					const v3Out = d3 > 0; // calculate, how many vertices of the face lie outside of the clipping plane

					total = ( v1Out ? 1 : 0 ) + ( v2Out ? 1 : 0 ) + ( v3Out ? 1 : 0 );

					switch ( total ) {

						case 0:
						{

							// the entire face lies inside of the plane, no clipping needed
							outVertices.push( inVertices[ i ] );
							outVertices.push( inVertices[ i + 1 ] );
							outVertices.push( inVertices[ i + 2 ] );
							break;

						}

						case 1:
						{

							// one vertex lies outside of the plane, perform clipping
							if ( v1Out ) {

								nV1 = inVertices[ i + 1 ];
								nV2 = inVertices[ i + 2 ];
								nV3 = clip( inVertices[ i ], nV1, plane, s );
								nV4 = clip( inVertices[ i ], nV2, plane, s );

							}

							if ( v2Out ) {

								nV1 = inVertices[ i ];
								nV2 = inVertices[ i + 2 ];
								nV3 = clip( inVertices[ i + 1 ], nV1, plane, s );
								nV4 = clip( inVertices[ i + 1 ], nV2, plane, s );
								outVertices.push( nV3 );
								outVertices.push( nV2.clone() );
								outVertices.push( nV1.clone() );
								outVertices.push( nV2.clone() );
								outVertices.push( nV3.clone() );
								outVertices.push( nV4 );
								break;

							}

							if ( v3Out ) {

								nV1 = inVertices[ i ];
								nV2 = inVertices[ i + 1 ];
								nV3 = clip( inVertices[ i + 2 ], nV1, plane, s );
								nV4 = clip( inVertices[ i + 2 ], nV2, plane, s );

							}

							outVertices.push( nV1.clone() );
							outVertices.push( nV2.clone() );
							outVertices.push( nV3 );
							outVertices.push( nV4 );
							outVertices.push( nV3.clone() );
							outVertices.push( nV2.clone() );
							break;

						}

						case 2:
						{

							// two vertices lies outside of the plane, perform clipping
							if ( ! v1Out ) {

								nV1 = inVertices[ i ].clone();
								nV2 = clip( nV1, inVertices[ i + 1 ], plane, s );
								nV3 = clip( nV1, inVertices[ i + 2 ], plane, s );
								outVertices.push( nV1 );
								outVertices.push( nV2 );
								outVertices.push( nV3 );

							}

							if ( ! v2Out ) {

								nV1 = inVertices[ i + 1 ].clone();
								nV2 = clip( nV1, inVertices[ i + 2 ], plane, s );
								nV3 = clip( nV1, inVertices[ i ], plane, s );
								outVertices.push( nV1 );
								outVertices.push( nV2 );
								outVertices.push( nV3 );

							}

							if ( ! v3Out ) {

								nV1 = inVertices[ i + 2 ].clone();
								nV2 = clip( nV1, inVertices[ i ], plane, s );
								nV3 = clip( nV1, inVertices[ i + 1 ], plane, s );
								outVertices.push( nV1 );
								outVertices.push( nV2 );
								outVertices.push( nV3 );

							}

							break;

						}

						case 3:
						{

							// the entire face lies outside of the plane, so let's discard the corresponding vertices
							break;

						}

					}

				}

				return outVertices;

			}

			function clip( v0, v1, p, s ) {

				const d0 = v0.position.dot( p ) - s;
				const d1 = v1.position.dot( p ) - s;
				const s0 = d0 / ( d0 - d1 );
				const v = new DecalVertex( new THREE.Vector3( v0.position.x + s0 * ( v1.position.x - v0.position.x ), v0.position.y + s0 * ( v1.position.y - v0.position.y ), v0.position.z + s0 * ( v1.position.z - v0.position.z ) ), new THREE.Vector3( v0.normal.x + s0 * ( v1.normal.x - v0.normal.x ), v0.normal.y + s0 * ( v1.normal.y - v0.normal.y ), v0.normal.z + s0 * ( v1.normal.z - v0.normal.z ) ) ); // need to clip more values (texture coordinates)? do it this way:
				// intersectpoint.value = a.value + s * ( b.value - a.value );

				return v;

			}

		}

	} // helper


	class DecalVertex {

		constructor( position, normal ) {

			this.position = position;
			this.normal = normal;

		}

		clone() {

			return new this.constructor( this.position.clone(), this.normal.clone() );

		}

	}

	THREE.DecalGeometry = DecalGeometry;
	THREE.DecalVertex = DecalVertex;

} )();
